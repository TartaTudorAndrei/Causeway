package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.account.CustomerAccountDetailsDTO;
import com.charityapp.dto.account.CustomerProfileUpdateDTO;
import com.charityapp.dto.account.CustomerRegisterRequestDTO;
import com.charityapp.dto.finance.DonationResponse;
import com.charityapp.dto.auth.LoginRequestDTO;
import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.AuthProvider;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.repository.finance.DonationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PublicAccountService {

    private final AdminUserRepository userRepository;
    private final DonationRepository donationRepository;
    private final PasswordHasher passwordHasher;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final EmailExistenceValidator emailValidator;
    private final RateLimiterService rateLimiterService;
    private final AdminAuthService adminAuthService;
    private final GoogleAuthService googleAuthService;
    private final AuditLogRepository auditLogRepository;

    public PublicAccountService(
            AdminUserRepository userRepository,
            DonationRepository donationRepository,
            PasswordHasher passwordHasher,
            PasswordPolicyValidator passwordPolicyValidator,
            EmailExistenceValidator emailValidator,
            RateLimiterService rateLimiterService,
            AdminAuthService adminAuthService,
            GoogleAuthService googleAuthService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.donationRepository = donationRepository;
        this.passwordHasher = passwordHasher;
        this.passwordPolicyValidator = passwordPolicyValidator;
        this.emailValidator = emailValidator;
        this.rateLimiterService = rateLimiterService;
        this.adminAuthService = adminAuthService;
        this.googleAuthService = googleAuthService;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public LoginResponseDTO registerCustomer(CustomerRegisterRequestDTO dto, String ip, String ua) {
        if (!rateLimiterService.isRequestAccessAllowed(ip)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Prea multe încercări de la această adresă IP.");
        }
        rateLimiterService.recordRequestAccessAttempt(ip);

        emailValidator.validateEmail(dto.getEmail());
        passwordPolicyValidator.validate(dto.getPassword());

        String normalizedEmail = dto.getEmail().toLowerCase().trim();
        Optional<AdminUser> existingOpt = userRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            AdminUser existing = existingOpt.get();
            boolean isStaff = existing.getRoles() != null && existing.getRoles().stream()
                .anyMatch(r -> !"CUSTOMER".equalsIgnoreCase(r));
            if (isStaff) {
                throw new IllegalArgumentException("Există deja un cont de echipă/voluntar cu acest email. Vă rugăm să vă conectați direct.");
            }
            throw new IllegalArgumentException("Există deja un cont înregistrat cu această adresă de email. Vă rugăm să vă conectați.");
        }

        AdminUser customer = new AdminUser();
        customer.setEmail(normalizedEmail);
        customer.setFullName(dto.getFullName().trim());
        customer.setPasswordHash(passwordHasher.hash(dto.getPassword()));
        customer.setPhone(dto.getPhone() != null ? dto.getPhone().trim() : null);
        customer.setAuthProvider(AuthProvider.LOCAL);
        customer.setStatus(AdminStatus.APPROVED);
        customer.setRole(AdminRole.CUSTOMER);
        customer.setRoles(Collections.singletonList(AdminRole.CUSTOMER));

        AdminUser saved = userRepository.save(customer);

        recordAudit(saved.getId(), "CUSTOMER_REGISTER", saved.getId(), ip, ua, "Cont nou client înregistrat");

        return adminAuthService.generateSessionResponse(saved, ip, ua);
    }

    public LoginResponseDTO loginCustomer(LoginRequestDTO dto, String ip, String ua) {
        if (!rateLimiterService.isLoginAllowed(ip, dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Prea multe încercări eșuate de conectare.");
        }

        AdminUser user = userRepository.findByEmail(dto.getEmail())
            .orElseThrow(() -> {
                rateLimiterService.recordLoginFailure(ip, dto.getEmail());
                return new IllegalArgumentException("Credențiale incorecte.");
            });

        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new IllegalArgumentException("Acest cont este asociat cu Google. Vă rugăm să vă conectați cu Google.");
        }

        if (!passwordHasher.verify(dto.getPassword(), user.getPasswordHash())) {
            rateLimiterService.recordLoginFailure(ip, dto.getEmail());
            return throwInvalidCredentials();
        }

        if (user.getStatus() != AdminStatus.APPROVED) {
            throw new AdminAuthService.StatusBlockedException(user.getStatus().name(), "Contul nu este activ.", user.getEmail());
        }

        rateLimiterService.resetLogin(ip, dto.getEmail());
        recordAudit(user.getId(), "CUSTOMER_LOGIN", user.getId(), ip, ua, "Autentificare client reușită");

        return adminAuthService.generateSessionResponse(user, ip, ua);
    }

    public LoginResponseDTO loginWithGoogle(String credential, String ip, String ua) throws Exception {
        return googleAuthService.authenticateOrRegisterCustomer(credential, ip, ua);
    }

    public CustomerAccountDetailsDTO getCustomerDetails(UUID userId) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilizatorul nu a fost găsit."));

        List<String> roles = user.getRoles() != null && !user.getRoles().isEmpty()
            ? user.getRoles()
            : List.of(user.getRole() != null ? user.getRole() : "CUSTOMER");

        boolean isVolunteerOrStaff = roles.stream().anyMatch(r -> !"CUSTOMER".equalsIgnoreCase(r));

        return new CustomerAccountDetailsDTO(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getPhone(),
            user.getRole(),
            roles,
            isVolunteerOrStaff
        );
    }

    public List<DonationResponse> getDonationsForCustomer(UUID userId) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilizatorul nu a fost găsit."));

        return donationRepository.findByDonorEmailWithPickupStatus(user.getEmail());
    }

    @Transactional
    public CustomerAccountDetailsDTO updateProfile(UUID userId, CustomerProfileUpdateDTO dto, String ip, String ua) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilizatorul nu a fost găsit."));

        user.setFullName(dto.getFullName().trim());
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone().trim());
        }

        if (dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
            if (user.getAuthProvider() == AuthProvider.GOOGLE) {
                throw new IllegalArgumentException("Conturile Google nu pot schimba parola locală.");
            }
            if (dto.getCurrentPassword() == null || !passwordHasher.verify(dto.getCurrentPassword(), user.getPasswordHash())) {
                throw new IllegalArgumentException("Parola actuală este incorectă.");
            }
            passwordPolicyValidator.validate(dto.getNewPassword());
            user.setPasswordHash(passwordHasher.hash(dto.getNewPassword()));
            user.setTokenVersion(user.getTokenVersion() + 1);
        }

        userRepository.updateUser(user);
        recordAudit(userId, "CUSTOMER_PROFILE_UPDATE", userId, ip, ua, "Profil client actualizat");

        return getCustomerDetails(userId);
    }

    private LoginResponseDTO throwInvalidCredentials() {
        throw new IllegalArgumentException("Credențiale incorecte.");
    }

    private void recordAudit(UUID actorId, String action, UUID entityId, String ip, String ua, String summary) {
        if (auditLogRepository == null) return;
        try {
            AuditLog log = new AuditLog();
            log.setActorId(actorId);
            log.setAction(action);
            log.setResourceType("admin_users");
            log.setResourceId(entityId);
            log.setIpAddress(ip);
            log.setUserAgent(ua);
            log.setDepartment("PUBLIC");
            log.setSummary(summary);
            log.setScopeType(ScopeType.GLOBAL);
            log.setStateChanges("{}");
            log.setCreatedAt(LocalDateTime.now());
            auditLogRepository.save(log);
        } catch (Exception ignored) {}
    }
}
