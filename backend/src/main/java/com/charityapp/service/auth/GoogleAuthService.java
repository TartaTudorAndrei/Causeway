package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.charityapp.dto.auth.GoogleRegisterRequestDTO;
import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.AuthProvider;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
public class GoogleAuthService {

    private final GoogleIdTokenVerifier verifier;
    private final AdminUserRepository userRepository;
    private final AdminAuthService authService;
    private final AuditLogRepository auditLogRepository;
    private final String hostedDomain;

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleAuthService(
            @Value("${app.google.oauth.client-id:}") String clientId,
            @Value("${app.google.oauth.hosted-domain:}") String hostedDomain,
            AdminUserRepository userRepository,
            AdminAuthService authService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) AuditLogRepository auditLogRepository) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(clientId != null && !clientId.isBlank() ? Collections.singletonList(clientId) : Collections.emptyList())
                .build();
        this.hostedDomain = hostedDomain;
        this.userRepository = userRepository;
        this.authService = authService;
        this.auditLogRepository = auditLogRepository;
    }

    public GoogleAuthService(
            GoogleIdTokenVerifier verifier,
            String hostedDomain,
            AdminUserRepository userRepository,
            AdminAuthService authService) {
        this(verifier, hostedDomain, userRepository, authService, null);
    }

    public GoogleAuthService(
            GoogleIdTokenVerifier verifier,
            String hostedDomain,
            AdminUserRepository userRepository,
            AdminAuthService authService,
            AuditLogRepository auditLogRepository) {
        this.verifier = verifier;
        this.hostedDomain = hostedDomain;
        this.userRepository = userRepository;
        this.authService = authService;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public LoginResponseDTO authenticateGoogleUser(String idTokenString, String ip, String ua) throws Exception {
        GoogleIdToken.Payload payload = verifyAndExtractPayload(idTokenString);

        String email = payload.getEmail();
        String normalizedEmail = email.toLowerCase().trim();
        Optional<AdminUser> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isEmpty()) {
            throw new AdminAuthService.StatusBlockedException(
                "NEEDS_REGISTRATION",
                "Contul nu este înregistrat. Vă rugăm să completați datele de profil.",
                normalizedEmail
            );
        }

        AdminUser user = userOpt.get();
        if (user.getAuthProvider() == AuthProvider.LOCAL) {
            user.setAuthProvider(AuthProvider.HYBRID);
            userRepository.updateUser(user);
        }

        if (user.getStatus() != AdminStatus.APPROVED) {
            throw new AdminAuthService.StatusBlockedException(
                user.getStatus().name(),
                "Contul dumneavoastră se află în starea: " + user.getStatus().name(),
                user.getEmail()
            );
        }

        boolean isOnlyCustomer = (user.getRoles() == null || user.getRoles().isEmpty() || user.getRoles().stream().allMatch(r -> "CUSTOMER".equalsIgnoreCase(r)))
            && "CUSTOMER".equalsIgnoreCase(user.getRole());
        if (isOnlyCustomer) {
            throw new AdminAuthService.StatusBlockedException(
                "CUSTOMER_ACCOUNT",
                "Acesta este un cont de client public. Pentru a accesa panoul intern, este necesară înregistrarea ca voluntar.",
                user.getEmail()
            );
        }

        return authService.generateSessionResponse(user, ip, ua);
    }

    @Transactional
    public AdminUser registerGoogleUser(GoogleRegisterRequestDTO dto, String ip, String ua) throws Exception {
        if (dto == null) {
            throw new IllegalArgumentException("Datele de înregistrare lipsesc.");
        }

        GoogleIdToken.Payload payload = verifyAndExtractPayload(dto.getCredential());

        String email = payload.getEmail();
        String normalizedEmail = email.toLowerCase().trim();
        Optional<AdminUser> existingOpt = userRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            AdminUser existing = existingOpt.get();
            if (existing.getStatus() == AdminStatus.PENDING_APPROVAL) {
                throw new AdminAuthService.StatusBlockedException(
                    "PENDING_APPROVAL",
                    "Cererea dumneavoastră este deja înregistrată și se află în curs de aprobare de către administrator.",
                    normalizedEmail
                );
            }
            throw new IllegalArgumentException("Acest email este deja înregistrat. Vă rugăm să vă conectați.");
        }

        AdminUser user = new AdminUser();
        user.setEmail(normalizedEmail);
        user.setFullName(dto.getFullName() != null ? dto.getFullName().trim() : "");
        user.setPhone(dto.getPhone() != null ? dto.getPhone().trim() : null);
        user.setOrganizationType(dto.getOrgType());
        user.setOrganizationDetails(dto.getOrgDetails());
        user.setNotes(dto.getJustification());
        user.setPasswordHash(null);
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setStatus(AdminStatus.PENDING_APPROVAL);
        user.setRole(AdminRole.VOLUNTEER);
        user.setRoles(Collections.singletonList(AdminRole.VOLUNTEER));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        AdminUser savedUser = userRepository.save(user);

        if (authService != null) {
            authService.sendVolunteerWelcomeNotification(savedUser);
        }

        if (auditLogRepository != null) {
            try {
                AuditLog log = new AuditLog();
                log.setId(UUID.randomUUID());
                log.setActorId(savedUser.getId());
                log.setActorEmail(savedUser.getEmail());
                log.setActorName(savedUser.getFullName());
                log.setAction("GOOGLE_REGISTRATION_REQUEST");
                log.setResourceType("USER");
                log.setResourceId(savedUser.getId());
                log.setIpAddress(ip);
                log.setUserAgent(ua);
                log.setDepartment("ADMIN");
                log.setSummary("Solicitare acces inregistrata prin Google");
                log.setScopeType(ScopeType.GLOBAL);
                log.setStateChanges("{}");
                log.setCreatedAt(LocalDateTime.now());
                auditLogRepository.save(log);
            } catch (Exception ignored) {}
        }

        return savedUser;
    }

    @Transactional
    public LoginResponseDTO authenticateOrRegisterCustomer(String idTokenString, String ip, String ua) throws Exception {
        GoogleIdToken.Payload payload = verifyAndExtractPayload(idTokenString);

        String email = payload.getEmail().toLowerCase().trim();
        String name = (String) payload.get("name");
        Optional<AdminUser> userOpt = userRepository.findByEmail(email);
        AdminUser user;

        if (userOpt.isPresent()) {
            user = userOpt.get();
            if (user.getAuthProvider() == AuthProvider.LOCAL) {
                user.setAuthProvider(AuthProvider.HYBRID);
                userRepository.updateUser(user);
            }
            if (user.getStatus() != AdminStatus.APPROVED) {
                throw new AdminAuthService.StatusBlockedException(
                    user.getStatus().name(),
                    "Contul dumneavoastră se află în starea: " + user.getStatus().name(),
                    user.getEmail()
                );
            }
        } else {
            user = new AdminUser();
            user.setEmail(email);
            user.setFullName(name != null && !name.isBlank() ? name.trim() : email.split("@")[0]);
            user.setPasswordHash(null);
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setStatus(AdminStatus.APPROVED);
            user.setRole(AdminRole.CUSTOMER);
            user.setRoles(Collections.singletonList(AdminRole.CUSTOMER));
            user = userRepository.save(user);

            if (auditLogRepository != null) {
                try {
                    AuditLog log = new AuditLog();
                    log.setActorId(user.getId());
                    log.setAction("CUSTOMER_REGISTER_GOOGLE");
                    log.setResourceType("admin_users");
                    log.setResourceId(user.getId());
                    log.setIpAddress(ip);
                    log.setUserAgent(ua);
                    log.setDepartment("PUBLIC");
                    log.setSummary("Cont client înregistrat prin Google");
                    log.setScopeType(ScopeType.GLOBAL);
                    log.setStateChanges("{}");
                    log.setCreatedAt(LocalDateTime.now());
                    auditLogRepository.save(log);
                } catch (Exception ignored) {}
            }
        }

        return authService.generateSessionResponse(user, ip, ua);
    }

    private GoogleIdToken.Payload verifyAndExtractPayload(String idTokenString) throws Exception {
        if (idTokenString == null || idTokenString.isBlank()) {
            throw new IllegalArgumentException("Token Google invalid sau lipsă.");
        }

        GoogleIdToken idToken = verifier.verify(idTokenString);
        if (idToken == null) {
            throw new IllegalArgumentException("Token Google invalid sau expirat.");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        if (payload == null) {
            throw new IllegalArgumentException("Datele token-ului Google sunt invalide.");
        }

        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Token Google fără adresă de email.");
        }

        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        if (!emailVerified) {
            throw new IllegalArgumentException("Adresa de email Google nu este verificată.");
        }

        if (hostedDomain != null && !hostedDomain.isBlank()) {
            String domain = payload.getHostedDomain();
            if (!hostedDomain.equalsIgnoreCase(domain)) {
                throw new IllegalArgumentException("Autentificarea este permisă doar pentru domeniul: " + hostedDomain);
            }
        }

        return payload;
    }
}
