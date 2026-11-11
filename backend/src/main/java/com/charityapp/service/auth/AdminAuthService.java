package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.TenantProperties;
import com.charityapp.dto.admin.CreateAdminUserDTO;
import com.charityapp.dto.auth.LoginRequestDTO;
import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.dto.auth.RequestAccessDTO;
import com.charityapp.model.auth.*;
import com.charityapp.model.admin.*;
import com.charityapp.model.finance.*;
import com.charityapp.model.notification.*;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.repository.auth.EmailVerificationTokenRepository;
import com.charityapp.repository.auth.PasswordResetTokenRepository;
import com.charityapp.repository.hr.HrRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AdminAuthService {
    private final AdminUserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordHasher passwordHasher;
    private final AdminEmailService emailService;
    private final EmailExistenceValidator emailValidator;
    private final TwoFactorAuthService twoFactorAuthService;
    private final JwtService jwtService;
    private final RateLimiterService rateLimiterService;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final TransactionTemplate transactionTemplate;

    private final Optional<SessionManagerService> sessionManagerService;
    private final Optional<HrRepository> hrRepository;
    private final Optional<com.charityapp.service.hr.HrService> hrService;
    private final Optional<WhatsAppNotificationService> whatsAppNotificationService;
    private final Optional<com.charityapp.repository.auth.PermissionRepository> permissionRepository;
    private final Optional<RoleManagementService> roleManagementService;
    private final Optional<TenantProperties> tenantProperties;

    @org.springframework.beans.factory.annotation.Value("${APP_FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;

    public AdminAuthService(AdminUserRepository userRepository,
                            EmailVerificationTokenRepository tokenRepository,
                            PasswordResetTokenRepository passwordResetTokenRepository,
                            AuditLogRepository auditLogRepository,
                            PasswordHasher passwordHasher,
                            AdminEmailService emailService,
                            EmailExistenceValidator emailValidator,
                            TwoFactorAuthService twoFactorAuthService,
                            JwtService jwtService,
                            RateLimiterService rateLimiterService,
                            PasswordPolicyValidator passwordPolicyValidator,
                            TransactionTemplate transactionTemplate) {
        this(userRepository, tokenRepository, passwordResetTokenRepository, auditLogRepository,
             passwordHasher, emailService, emailValidator, twoFactorAuthService,
             jwtService, rateLimiterService, passwordPolicyValidator, transactionTemplate,
             Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty());
    }

    public AdminAuthService(AdminUserRepository userRepository,
                            EmailVerificationTokenRepository tokenRepository,
                            PasswordResetTokenRepository passwordResetTokenRepository,
                            PasswordHasher passwordHasher,
                            AdminEmailService emailService,
                            EmailExistenceValidator emailValidator,
                            TwoFactorAuthService twoFactorAuthService,
                            JwtService jwtService,
                            RateLimiterService rateLimiterService,
                            PasswordPolicyValidator passwordPolicyValidator,
                            TransactionTemplate transactionTemplate) {
        this(userRepository, tokenRepository, passwordResetTokenRepository, null,
             passwordHasher, emailService, emailValidator, twoFactorAuthService,
             jwtService, rateLimiterService, passwordPolicyValidator, transactionTemplate,
             Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AdminAuthService(AdminUserRepository userRepository,
                            EmailVerificationTokenRepository tokenRepository,
                            PasswordResetTokenRepository passwordResetTokenRepository,
                            @org.springframework.beans.factory.annotation.Autowired(required = false) AuditLogRepository auditLogRepository,
                            PasswordHasher passwordHasher,
                            AdminEmailService emailService,
                            EmailExistenceValidator emailValidator,
                            TwoFactorAuthService twoFactorAuthService,
                            JwtService jwtService,
                            RateLimiterService rateLimiterService,
                            PasswordPolicyValidator passwordPolicyValidator,
                            TransactionTemplate transactionTemplate,
                            Optional<SessionManagerService> sessionManagerService,
                            @org.springframework.context.annotation.Lazy Optional<HrRepository> hrRepository,
                            @org.springframework.context.annotation.Lazy Optional<com.charityapp.service.hr.HrService> hrService,
                            @org.springframework.context.annotation.Lazy Optional<WhatsAppNotificationService> whatsAppNotificationService,
                            Optional<com.charityapp.repository.auth.PermissionRepository> permissionRepository,
                            @org.springframework.context.annotation.Lazy Optional<RoleManagementService> roleManagementService,
                            Optional<TenantProperties> tenantProperties) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordHasher = passwordHasher;
        this.emailService = emailService;
        this.emailValidator = emailValidator;
        this.twoFactorAuthService = twoFactorAuthService;
        this.jwtService = jwtService;
        this.rateLimiterService = rateLimiterService;
        this.passwordPolicyValidator = passwordPolicyValidator;
        
        this.transactionTemplate = transactionTemplate;
        this.sessionManagerService = sessionManagerService;
        this.hrRepository = hrRepository;
        this.hrService = hrService;
        this.whatsAppNotificationService = whatsAppNotificationService;
        this.permissionRepository = permissionRepository;
        this.roleManagementService = roleManagementService;
        this.tenantProperties = tenantProperties;
    }


    public List<AdminUser> getAllUsers() {
        return userRepository.findAll();
    }

    public AdminUser getUserById(UUID id) {
        if (id == null) return null;
        return userRepository.findById(id).orElse(null);
    }

    public String determineBaseUrl(String clientOrigin) {
        if (clientOrigin != null && !clientOrigin.isBlank() && !"null".equalsIgnoreCase(clientOrigin.trim())) {
            return clientOrigin.trim().replaceAll("/+$", "");
        }
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            return frontendUrl.trim().replaceAll("/+$", "");
        }
        return "http://localhost:5173";
    }

    @Transactional
    public void requestAccess(RequestAccessDTO dto, String ip, String ua) {
        requestAccess(dto, ip, ua, null);
    }

    @Transactional
    public void requestAccess(RequestAccessDTO dto, String ip, String ua, String clientOrigin) {
        if (!rateLimiterService.isRequestAccessAllowed(ip)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Prea multe încercări de creare a contului de la această adresă IP. Vă rugăm să încercați mai târziu.");
        }
        rateLimiterService.recordRequestAccessAttempt(ip);

        emailValidator.validateEmail(dto.getEmail());

        Optional<AdminUser> existing = userRepository.findByEmail(dto.getEmail());
        AdminUser user;
        passwordPolicyValidator.validate(dto.getPassword());
        String rawPassword = dto.getPassword();

        if (existing.isPresent()) {
            user = existing.get();
            boolean isOnlyCustomer = (user.getRoles() == null || user.getRoles().isEmpty() || user.getRoles().stream().allMatch(r -> "CUSTOMER".equalsIgnoreCase(r)))
                && "CUSTOMER".equalsIgnoreCase(user.getRole());
            if (isOnlyCustomer) {
                user.setFullName(dto.getFullName());
                if (rawPassword != null && !rawPassword.isBlank()) {
                    user.setPasswordHash(passwordHasher.hash(rawPassword));
                }
                user.setPhone(dto.getPhone());
                user.setOrganizationType(dto.getOrgType());
                user.setOrganizationDetails(dto.getOrgDetails());
                user.setNotes(dto.getJustification());
                user.setStatus(AdminStatus.PENDING_APPROVAL);
                userRepository.updateUser(user);
                tokenRepository.deleteByUserId(user.getId());
                sendVolunteerWelcomeNotification(user);
                recordAudit(null, "CUSTOMER_VOLUNTEER_APPLICATION", user.getId(), ip, ua, "Cerere înscriere voluntar de la client existent");
                return;
            } else if (user.getStatus() == AdminStatus.PENDING_EMAIL_VERIFICATION) {
                user.setFullName(dto.getFullName());
                user.setPasswordHash(passwordHasher.hash(rawPassword));
                user.setPhone(dto.getPhone());
                user.setOrganizationType(dto.getOrgType());
                user.setOrganizationDetails(dto.getOrgDetails());
                user.setNotes(dto.getJustification());
                userRepository.updateUser(user);
                tokenRepository.deleteByUserId(user.getId());
                sendVolunteerWelcomeNotification(user);
            } else if (user.getStatus() == AdminStatus.PENDING_APPROVAL) {
                throw new IllegalArgumentException("Cererea dumneavoastră este deja înregistrată și se află în curs de aprobare de către administrator.");
            } else {
                throw new IllegalArgumentException("Acest email este deja înregistrat. Vă rugăm să vă conectați.");
            }
        } else {
            user = new AdminUser(
                dto.getFullName(),
                dto.getEmail(),
                passwordHasher.hash(rawPassword),
                AdminStatus.PENDING_EMAIL_VERIFICATION,
                AdminRole.VOLUNTEER
            );
            user.setPhone(dto.getPhone());
            user.setOrganizationType(dto.getOrgType());
            user.setOrganizationDetails(dto.getOrgDetails());
            user.setNotes(dto.getJustification());
            user = userRepository.save(user);
            sendVolunteerWelcomeNotification(user);
        }

        String rawToken = UUID.randomUUID().toString();
        String hash = hashToken(rawToken);
        
        EmailVerificationToken token = new EmailVerificationToken(
            hash,
            user.getId(),
            LocalDateTime.now().plusHours(24)
        );
        tokenRepository.save(token);

        // Send email with dynamic base URL
        String baseUrl = determineBaseUrl(clientOrigin);
        String link = baseUrl + "/dashboard/login?verifyToken=" + rawToken;
        String shorthand = tenantProperties.map(TenantProperties::getShorthand).orElse("CHARITY");
        String orgName = tenantProperties.map(TenantProperties::getName).orElse("Causeway");

        String emailBody = String.format(
            "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
            + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Confirmare Cont %s</h2>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Bună %s,</p>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Vă mulțumim pentru înregistrarea contului pe platforma %s. Pentru a continua procesul, vă rugăm să confirmați adresa de email:</p>"
            + "<div style='margin: 28px 0; text-align: center;'>"
            + "<a href='%s' style='background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;'>Confirmă adresa de email</a>"
            + "</div>"
            + "<p style='color: #71717a; font-size: 12px; line-height: 1.4;'>Dacă butonul nu funcționează, copiați și accesați link-ul în browser:<br/><a href='%s' style='color: #60a5fa; word-break: break-all;'>%s</a></p>"
            + "</div>",
            shorthand, user.getFullName(), orgName, link, link, link
        );
        emailService.sendEmail(user.getEmail(), "Confirmare email " + shorthand + " Admin", emailBody);

        recordAudit(null, "REGISTRATION_REQUEST", user.getId(), ip, ua, "Creare cont inregistrata");
    }

    @Transactional
    public AdminUser getOrCreateUserForPublicSignup(String fullName, String email, String rawPassword, String phone, String orgType, String orgDetails, String ip, String ua, String clientOrigin) {
        return getOrCreateUserForPublicSignup(fullName, email, rawPassword, phone, orgType, orgDetails, null, null, null, ip, ua, clientOrigin);
    }

    @Transactional
    public AdminUser getOrCreateUserForPublicSignup(String fullName, String email, String rawPassword, String phone, String orgType, String orgDetails,
                                                   UUID pendingShiftId, UUID pendingRoleId, UUID pendingStandId,
                                                   String ip, String ua, String clientOrigin) {
        emailValidator.validateEmail(email);

        Optional<AdminUser> existing = userRepository.findByEmail(email);
        AdminUser user;
        passwordPolicyValidator.validate(rawPassword);
        String pass = rawPassword;

        if (existing.isPresent()) {
            user = existing.get();
            // If user already registered and active, do not allow overwriting account
            if (user.getStatus() == AdminStatus.APPROVED) {
                return user;
            }
            // Update password & details for pending signup
            user.setPasswordHash(passwordHasher.hash(pass));
            user.setPhone(phone);
            user.setOrganizationType(orgType);
            user.setOrganizationDetails(orgDetails);
            userRepository.updateUser(user);
        } else {
            user = new AdminUser(
                fullName,
                email,
                passwordHasher.hash(pass),
                AdminStatus.PENDING_EMAIL_VERIFICATION,
                AdminRole.VOLUNTEER
            );
            user.setPhone(phone);
            user.setOrganizationType(orgType);
            user.setOrganizationDetails(orgDetails);
            user = userRepository.save(user);
            sendVolunteerWelcomeNotification(user);

            // Generate email verification token
            String rawToken = UUID.randomUUID().toString();
            String hash = hashToken(rawToken);

            EmailVerificationToken token = new EmailVerificationToken(
                hash,
                user.getId(),
                LocalDateTime.now().plusHours(24),
                pendingShiftId,
                pendingRoleId,
                pendingStandId
            );
            tokenRepository.save(token);

            // Send confirmation email
            String baseUrl = determineBaseUrl(clientOrigin);
            String link = baseUrl + "/dashboard/login?verifyToken=" + rawToken;
            String shorthand = tenantProperties.map(TenantProperties::getShorthand).orElse("CHARITY");
            String emailBody = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
                + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Confirmare Cont %s Voluntar</h2>"
                + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Bună %s,</p>"
                + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Te-ai înscris la un schimb de voluntariat! Pentru a rezerva locul tău pe schimb și a trimite cererea spre aprobarea coordonatorului, te rugăm să confirmi adresa de email:</p>"
                + "<div style='margin: 28px 0; text-align: center;'>"
                + "<a href='%s' style='background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;'>Confirmă adresa de email</a>"
                + "</div>"
                + "<p style='color: #71717a; font-size: 12px; line-height: 1.4;'>Dacă butonul nu funcționează, accesează link-ul în browser:<br/><a href='%s' style='color: #60a5fa; word-break: break-all;'>%s</a></p>"
                + "</div>",
                shorthand, user.getFullName(), link, link, link
            );
            emailService.sendEmail(user.getEmail(), "Confirmare cont " + shorthand + " Voluntar", emailBody);

            recordAudit(null, "STAND_SIGNUP_REGISTRATION", user.getId(), ip, ua, "Inregistrare cont prin inscriere stand");
        }

        return user;
    }

    public record VerificationResult(AdminUser user, boolean statusChanged) {}

    public AdminUser verifyEmail(String rawToken, String ip, String ua) {
        return verifyEmail(rawToken, ip, ua, null);
    }

    /**
     * Verifies email token and transitions user to PENDING_APPROVAL.
     * The DB update is committed in a separate transactional method so that
     * a subsequent notification-email failure cannot roll back the status change.
     */
    public AdminUser verifyEmail(String rawToken, String ip, String ua, String clientOrigin) {
        String tokenHash = (rawToken != null && !rawToken.isBlank()) ? hashToken(rawToken.trim()) : null;
        Optional<EmailVerificationToken> tokenOpt = tokenHash != null ? tokenRepository.findByTokenHash(tokenHash) : Optional.empty();

        VerificationResult result = verifyEmailTransactional(rawToken, ip, ua);
        AdminUser user = result.user();

        // If there was a pending stand shift signup on the verification token and user was newly verified, hold the slot
        if (result.statusChanged() && tokenOpt.isPresent() && hrService.isPresent()) {
            EmailVerificationToken token = tokenOpt.get();
            if (token.getPendingShiftId() != null && token.getPendingRoleId() != null) {
                try {
                    hrService.get().activatePendingHold(user.getId(), token.getPendingShiftId(), token.getPendingRoleId(), token.getPendingStandId());
                } catch (Exception ex) {
                    System.err.println("Failed to activate pending shift hold on verify email: " + ex.getMessage());
                }
            }
        }

        // Send notification email OUTSIDE the transaction only once upon first transition
        if (result.statusChanged()) {
            try {
                String baseUrl = determineBaseUrl(clientOrigin);
                String shorthand = tenantProperties.map(TenantProperties::getShorthand).orElse("CHARITY");
                String adminEmail = tenantProperties.map(t -> (String) t.getIntegrations().getContactEmail()).orElse("admin@example.org");
                emailService.sendEmail(
                    adminEmail, 
                    "Cerere nouă aprobare " + shorthand + " Admin", 
                    String.format(
                        "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
                        + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Cerere Nouă de Acces %s</h2>"
                        + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Utilizatorul <strong>%s</strong> (%s) a confirmat emailul și așteaptă aprobarea contului.</p>"
                        + "<div style='margin: 24px 0;'>"
                        + "<a href='%s/dashboard/login' style='background-color: #2563eb; color: #ffffff; padding: 10px 22px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px;'>Deschide Panou Administrare</a>"
                        + "</div></div>",
                        shorthand, user.getFullName(), user.getEmail(), baseUrl
                    )
                );
            } catch (Exception emailEx) {
                // Log but do not propagate — the DB status is already committed
                System.err.println("Failed to send admin notification email after email verification: " + emailEx.getMessage());
            }
        }

        return user;
    }

    private VerificationResult verifyEmailTransactional(String rawToken, String ip, String ua) {
        return transactionTemplate.execute(status -> {
            if (rawToken == null || rawToken.isBlank()) {
                throw new IllegalArgumentException("Token invalid sau lipsă.");
            }
            String hash = hashToken(rawToken.trim());
            EmailVerificationToken token = tokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Token invalid sau expirat."));

            if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Token-ul a expirat.");
            }

            AdminUser user = userRepository.findById(token.getAdminUserId())
                .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

            if (user.getStatus() == AdminStatus.PENDING_APPROVAL || user.getStatus() == AdminStatus.APPROVED) {
                // Already verified (idempotent retry/double-call safety)
                return new VerificationResult(user, false);
            }

            if (user.getStatus() != AdminStatus.PENDING_EMAIL_VERIFICATION) {
                throw new IllegalArgumentException("Starea contului nu permite verificarea.");
            }

            userRepository.updateStatus(user.getId(), AdminStatus.PENDING_APPROVAL);
            user.setStatus(AdminStatus.PENDING_APPROVAL);

            recordAudit(null, "EMAIL_VERIFIED", user.getId(), ip, ua, "Email confirmat cu succes");

            return new VerificationResult(user, true);
        });
    }

    public LoginResponseDTO login(LoginRequestDTO dto, String ip, String ua) {
        if (!rateLimiterService.isLoginAllowed(ip, dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Prea multe încercări eșuate de conectare. Vă rugăm să încercați din nou în 15 minute.");
        }

        AdminUser user = userRepository.findByEmail(dto.getEmail())
            .orElseThrow(() -> {
                rateLimiterService.recordLoginFailure(ip, dto.getEmail());
                recordAudit(null, "LOGIN_FAILED", null, ip, ua, "Email inexistent: " + dto.getEmail());
                return new IllegalArgumentException("Credențiale incorecte.");
            });

        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new IllegalArgumentException("Acest cont folosește autentificarea Google. Vă rugăm să vă conectați cu Google.");
        }

        if (!passwordHasher.verify(dto.getPassword(), user.getPasswordHash())) {
            rateLimiterService.recordLoginFailure(ip, dto.getEmail());
            recordAudit(null, "LOGIN_FAILED", user.getId(), ip, ua, "Parolă incorectă");
            throw new IllegalArgumentException("Credențiale incorecte.");
        }

        // Auto-upgrade password hash to 600,000 PBKDF2 iterations if legacy or low iterations
        String newHash = passwordHasher.rehashIfNeeded(dto.getPassword(), user.getPasswordHash());
        if (newHash != null) {
            userRepository.updatePassword(user.getId(), newHash);
            user.setPasswordHash(newHash);
        }

        if (user.getStatus() != AdminStatus.APPROVED) {
            recordAudit(null, "LOGIN_BLOCKED", user.getId(), ip, ua, "Status cont nepermis: " + user.getStatus());
            
            // Custom status exception
            StatusBlockedException exception = new StatusBlockedException("Contul nu este activ.");
            exception.setStatus(user.getStatus().name());
            throw exception;
        }

        boolean isOnlyCustomer = (user.getRoles() == null || user.getRoles().isEmpty() || user.getRoles().stream().allMatch(r -> "CUSTOMER".equalsIgnoreCase(r)))
            && "CUSTOMER".equalsIgnoreCase(user.getRole());
        if (isOnlyCustomer) {
            recordAudit(null, "LOGIN_BLOCKED", user.getId(), ip, ua, "Cont client blocat la autentificare dashboard");
            throw new StatusBlockedException(
                "CUSTOMER_ACCOUNT",
                "Acesta este un cont de client public. Pentru a accesa panoul intern, este necesară înregistrarea ca voluntar.",
                user.getEmail()
            );
        }

        // Reset rate limiter on successful authentication
        rateLimiterService.resetLogin(ip, dto.getEmail());

        // If 2FA enabled, issue challenge instead of logging in directly
        if (user.isTwoFactorEnabled()) {
            return twoFactorAuthService.createLoginChallenge(user, ip, ua);
        }

        return generateSessionResponse(user, ip, ua);
    }

    public LoginResponseDTO generateSessionResponse(AdminUser user, String ip, String ua) {
        userRepository.updateLastLogin(user.getId(), LocalDateTime.now());

        List<String> roles = user.getRoles() != null && !user.getRoles().isEmpty()
            ? user.getRoles()
            : List.of(user.getRole() != null ? user.getRole() : "VOLUNTEER");
        String primaryRole = user.getRole() != null ? user.getRole() : roles.get(0);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), primaryRole, roles, user.getTokenVersion());
        String expiresAt = LocalDateTime.now().plusHours(jwtService.getExpirationHours()).toString();

        if (sessionManagerService.isPresent()) {
            String tokenHash = hashToken(token);
            sessionManagerService.get().registerSession(
                user.getId(), tokenHash, ip, ua,
                java.time.Instant.now().plus(jwtService.getExpirationHours(), java.time.temporal.ChronoUnit.HOURS)
            );
        }

        recordAudit(user.getId(), "LOGIN_SUCCESS", user.getId(), ip, ua, "Autentificare reușită");

        List<String> permissions = getPermissionCodesForRoles(roles);

        return new LoginResponseDTO(
            token,
            expiresAt,
            new LoginResponseDTO.UserDetailsDTO(
                user.getFullName(),
                user.getEmail(),
                primaryRole,
                roles,
                user.getPhone(),
                user.getOrganizationType(),
                user.getOrganizationDetails(),
                permissions,
                user.isWhatsappNotificationsEnabled()
            )
        );
    }

    public List<String> getPermissionCodesForRoles(List<String> roleNames) {
        if (permissionRepository.isEmpty() || roleNames == null || roleNames.isEmpty()) {
            return List.of();
        }
        return permissionRepository.get().findPermissionCodesByRoleNames(roleNames);
    }

    public String getStatus(String email) {
        return userRepository.findByEmail(email)
            .map(user -> user.getStatus().name())
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));
    }

    public List<AdminUser> getPendingApprovals() {
        return userRepository.findPendingApproval();
    }

    private void requireAdminActor(UUID actorId) {
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Actor necunoscut sau sesiune invalidă.");
        }
        AdminUser actor = userRepository.findById(actorId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Actor necunoscut."));
        boolean isAdmin = actor.hasRole("ADMIN") || actor.hasRole("IT_ADMIN") || actor.hasRole("SUPER_ADMIN");
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar administratorii pot efectua această acțiune.");
        }
    }

    @Transactional
    public void approveUser(UUID id, UUID actorId, String ip, String ua) {
        approveUser(id, actorId, ip, ua, null);
    }

    @Transactional
    public void approveUser(UUID id, UUID actorId, String ip, String ua, String clientOrigin) {
        requireAdminActor(actorId);

        AdminUser user = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        if (user.getStatus() != AdminStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Utilizatorul nu se află în așteptarea aprobării.");
        }

        userRepository.updateStatus(id, AdminStatus.APPROVED);
        if (user.getRole() == null || "ADMIN".equalsIgnoreCase(user.getRole()) || "SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            userRepository.updateRole(id, "VOLUNTEER");
        }

        String baseUrl = determineBaseUrl(clientOrigin);
        String shorthand = tenantProperties.map(TenantProperties::getShorthand).orElse("CHARITY");
        emailService.sendEmail(
            user.getEmail(),
            "Acces aprobat " + shorthand + " Admin",
            String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
                + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Cont Aprobat - %s</h2>"
                + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Bună %s,</p>"
                + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Solicitarea dumneavoastră de acces a fost aprobată de un administrator. Acum vă puteți autentifica în platformă:</p>"
                + "<div style='margin: 24px 0;'>"
                + "<a href='%s/dashboard/login' style='background-color: #10b981; color: #ffffff; padding: 12px 26px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;'>Autentificare în Platformă</a>"
                + "</div></div>",
                shorthand, user.getFullName(), baseUrl
            )
        );

        if (hrRepository.isPresent()) {
            try {
                hrRepository.get().approveAssignmentsForUser(id, actorId);
            } catch (Exception ignored) {}
        }

        if (whatsAppNotificationService.isPresent()) {
            try {
                whatsAppNotificationService.get().sendVolunteerApprovalNotification(user);
            } catch (Exception ignored) {}
        }

        recordAudit(actorId, "APPROVED", id, ip, ua, "Solicitare aprobată cu succes");
    }


    @Transactional
    public void rejectUser(UUID id, String reason, UUID actorId, String ip, String ua) {
        requireAdminActor(actorId);

        AdminUser user = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        String notes = (reason != null && !reason.isBlank()) ? "Respins: " + reason.trim() : user.getNotes();
        userRepository.updateStatusAndNotes(id, AdminStatus.REJECTED, notes);

        if (hrRepository.isPresent()) {
            try {
                hrRepository.get().deleteAssignmentsForUser(id);
            } catch (Exception ignored) {}
        }

        String shorthand = tenantProperties.map(TenantProperties::getShorthand).orElse("CHARITY");
        emailService.sendEmail(
            user.getEmail(),
            "Decizie acces " + shorthand + " Admin",
            String.format("<p>Bună %s,</p><p>Ne pare rău, dar cererea dumneavoastră de creare cont a fost respinsă.%s</p>", 
                user.getFullName(), 
                (reason != null && !reason.isBlank()) ? "<br>Motiv: " + reason : "")
        );

        recordAudit(actorId, "REJECTED", id, ip, ua, "Cerere cont respinsă. " + (reason != null ? "Motiv: " + reason : ""));
    }

    @Transactional
    public void suspendUser(UUID id, UUID actorId, String ip, String ua) {
        requireAdminActor(actorId);

        AdminUser user = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        userRepository.updateStatus(id, AdminStatus.SUSPENDED);
        userRepository.incrementTokenVersion(id);

        recordAudit(actorId, "SUSPENDED", id, ip, ua, "Cont utilizator suspendat: " + user.getEmail());
    }

    @Transactional
    public void deleteUser(UUID id, UUID actorId, String ip, String ua) {
        requireAdminActor(actorId);

        if (id.equals(actorId)) {
            throw new IllegalArgumentException("Nu vă puteți șterge propriul cont.");
        }

        AdminUser user = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        if (user.hasRole("ADMIN") || user.hasRole("SUPER_ADMIN")) {
            throw new IllegalArgumentException("Nu se pot șterge conturile de administrator.");
        }

        sessionManagerService.ifPresent(s -> s.revokeAllSessions(id));

        recordAudit(actorId, "USER_DELETED", id, ip, ua, "Cont utilizator șters: " + user.getEmail() + " (" + user.getFullName() + ")");

        userRepository.deleteById(id);
    }

    @Transactional
    public void updateUserRole(UUID id, String roleName, UUID actorId, String ip, String ua) {
        updateUserRoles(id, roleName != null ? List.of(roleName) : List.of("VOLUNTEER"), actorId, ip, ua);
    }

    @Transactional
    public void updateUserRoles(UUID id, List<String> roleNames, UUID actorId, String ip, String ua) {
        requireAdminActor(actorId);

        if (roleNames != null && !roleNames.isEmpty() && roleManagementService.isPresent()) {
            roleManagementService.get().validateRoleAssignmentAuthority(actorId, roleNames);
        }

        AdminUser user = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        List<String> roles = (roleNames != null && !roleNames.isEmpty())
            ? roleNames.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()
            : List.of("VOLUNTEER");

        String primaryRole = roleManagementService.isPresent()
            ? roleManagementService.get().determinePrimaryRole(roles)
            : roles.get(0);

        userRepository.updateRoles(id, primaryRole, roles);
        userRepository.incrementTokenVersion(id);

        String rolesStr = String.join(", ", roles);
        recordAudit(actorId, "ROLE_UPDATED", id, ip, ua, "Roluri actualizate la [" + rolesStr + "] (Principal: " + primaryRole + ") pentru " + user.getEmail());
    }


    @Transactional
    public AdminUser createUser(CreateAdminUserDTO dto, UUID actorId, String ip, String ua) {
        requireAdminActor(actorId);

        emailValidator.validateEmail(dto.getEmail());

        Optional<AdminUser> existing = userRepository.findByEmail(dto.getEmail());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Există deja un utilizator înregistrat cu această adresă de email.");
        }

        passwordPolicyValidator.validate(dto.getPassword());
        String rawPassword = dto.getPassword();

        AdminStatus status = AdminStatus.APPROVED;
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            try {
                status = AdminStatus.valueOf(dto.getStatus().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        List<String> dtoRoles = dto.getRoles();
        List<String> roles = (dtoRoles != null && !dtoRoles.isEmpty())
            ? dtoRoles.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()
            : (dto.getRole() != null && !dto.getRole().isBlank() ? List.of(dto.getRole().trim()) : List.of("VOLUNTEER"));

        String primaryRole = roleManagementService.isPresent()
            ? roleManagementService.get().determinePrimaryRole(roles)
            : roles.get(0);

        AdminUser newUser = new AdminUser(
            dto.getFullName(),
            dto.getEmail(),
            passwordHasher.hash(rawPassword),
            status,
            roles
        );
        newUser.setRole(primaryRole);
        newUser.setPhone(dto.getPhone());
        newUser.setOrganizationType(dto.getOrganizationType());
        newUser.setOrganizationDetails(dto.getOrganizationDetails());
        newUser.setNotes(dto.getNotes());

        userRepository.save(newUser);
        sendVolunteerWelcomeNotification(newUser);

        String rolesStr = String.join(", ", roles);
        recordAudit(actorId, "USER_CREATED", newUser.getId(), ip, ua, "Utilizator nou creat manual: " + newUser.getEmail() + " (" + rolesStr + ", Principal: " + primaryRole + ")");

        return newUser;
    }

    public void sendVolunteerWelcomeNotification(AdminUser user) {
        if (user != null && whatsAppNotificationService != null && whatsAppNotificationService.isPresent()) {
            try {
                whatsAppNotificationService.get().sendVolunteerWelcomeNotification(user);
            } catch (Exception ex) {
                System.err.println("Failed to send WhatsApp volunteer welcome message: " + ex.getMessage());
            }
        }
    }

    @Transactional
    public void forgotPassword(String email, String ip, String ua, String clientOrigin) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Adresa de email este obligatorie.");
        }

        String normalizedEmail = email.trim().toLowerCase();
        if (!rateLimiterService.isForgotPasswordAllowed(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Prea multe solicitări de resetare a parolei. Vă rugăm să încercați mai târziu.");
        }
        rateLimiterService.recordForgotPasswordAttempt(normalizedEmail);

        Optional<AdminUser> existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isEmpty()) {
            recordAudit(null, "PASSWORD_RESET_REQUEST_UNKNOWN", null, ip, ua, "Cerere resetare parolă pentru email inexistent: " + normalizedEmail);
            return;
        }

        AdminUser user = existing.get();
        if (user.getStatus() == AdminStatus.SUSPENDED || user.getStatus() == AdminStatus.REJECTED) {
            recordAudit(user.getId(), "PASSWORD_RESET_BLOCKED", user.getId(), ip, ua, "Cerere resetare parolă blocată din cauza statusului: " + user.getStatus());
            return;
        }

        passwordResetTokenRepository.deleteByUserId(user.getId());

        String rawToken = UUID.randomUUID().toString();
        String hash = hashToken(rawToken);

        PasswordResetToken resetToken = new PasswordResetToken(
            hash,
            user.getId(),
            LocalDateTime.now().plusHours(2)
        );
        passwordResetTokenRepository.save(resetToken);

        String baseUrl = determineBaseUrl(clientOrigin);
        String resetLink = baseUrl + "/dashboard/login?resetToken=" + rawToken;
        String shorthand = tenantProperties.map(TenantProperties::getShorthand).orElse("CHARITY");
        String emailBody = String.format(
            "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
            + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Resetare Parolă %s</h2>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Bună %s,</p>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Am primit o solicitare de resetare a parolei pentru contul dumneavoastră. Pentru a vă seta o nouă parolă, accesați link-ul de mai jos:</p>"
            + "<div style='margin: 28px 0; text-align: center;'>"
            + "<a href='%s' style='background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;'>Resetează Parola</a>"
            + "</div>"
            + "<p style='color: #a1a1aa; font-size: 13px; line-height: 1.5;'>Acest link este valabil timp de 2 ore. Dacă nu ați solicitat resetarea parolei, vă rugăm să ignorați acest mesaj.</p>"
            + "<hr style='border: 0; border-top: 1px solid #27272a; margin: 20px 0;'/>"
            + "<p style='color: #71717a; font-size: 12px; line-height: 1.4;'>Dacă butonul nu funcționează, copiați și accesați link-ul în browser:<br/><a href='%s' style='color: #60a5fa; word-break: break-all;'>%s</a></p>"
            + "</div>",
            shorthand, user.getFullName(), resetLink, resetLink, resetLink
        );
        emailService.sendEmail(user.getEmail(), "Resetare parolă cont " + shorthand, emailBody);

        recordAudit(user.getId(), "PASSWORD_RESET_REQUESTED", user.getId(), ip, ua, "Link de resetare trimis pe email");
    }

    public boolean validateResetToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        String hash = hashToken(rawToken.trim());
        Optional<PasswordResetToken> optToken = passwordResetTokenRepository.findByTokenHash(hash);
        if (optToken.isEmpty()) {
            return false;
        }
        PasswordResetToken token = optToken.get();
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.deleteByTokenHash(hash);
            return false;
        }
        return true;
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword, String ip, String ua) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Token de resetare invalid sau lipsă.");
        }
        passwordPolicyValidator.validate(newPassword);

        String hash = hashToken(rawToken.trim());
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(hash)
            .orElseThrow(() -> new IllegalArgumentException("Token-ul de resetare este invalid sau a expirat."));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.deleteByTokenHash(hash);
            throw new IllegalArgumentException("Token-ul de resetare a expirat. Vă rugăm să solicitați un link nou.");
        }

        AdminUser user = userRepository.findById(token.getAdminUserId())
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul asociat nu a fost găsit."));

        String newPasswordHash = passwordHasher.hash(newPassword);
        userRepository.updatePassword(user.getId(), newPasswordHash);
        userRepository.incrementTokenVersion(user.getId());

        // Invalidate token
        passwordResetTokenRepository.deleteByUserId(user.getId());
        if (sessionManagerService.isPresent()) {
            sessionManagerService.get().revokeAllSessions(user.getId());
        }

        recordAudit(user.getId(), "PASSWORD_RESET_SUCCESS", user.getId(), ip, ua, "Parolă resetată cu succes");
    }

    public void logout(UUID userId) {
        if (userId != null) {
            userRepository.incrementTokenVersion(userId);
            if (sessionManagerService.isPresent()) {
                sessionManagerService.get().revokeAllSessions(userId);
            }
            recordAudit(userId, "LOGOUT", userId, null, null, "Deconectare utilizator și revocare token-uri active");
        }
    }

    private void recordAudit(UUID actorId, String action, UUID targetId, String ip, String ua, String details) {
        if (auditLogRepository == null) return;
        try {
            AuditLog log = new AuditLog();
            log.setId(UUID.randomUUID());
            log.setActorId(actorId);
            log.setActorEmail("system@example.org");
            log.setActorName("System");
            log.setAction(action);
            log.setResourceType("USER");
            log.setResourceId(targetId);
            log.setIpAddress(ip);
            log.setUserAgent(ua);
            log.setDepartment("ADMIN");
            log.setSummary(details);
            log.setScopeType(ScopeType.GLOBAL);
            log.setStateChanges("{}");
            log.setCreatedAt(LocalDateTime.now());
            auditLogRepository.save(log);
        } catch (Exception ignored) {}
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedHash.length);
            for (byte b : encodedHash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Eroare la calcularea hash-ului", e);
        }
    }

    public void updateWhatsappNotificationsPreference(UUID userId, boolean enabled) {
        AdminUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));
        userRepository.updateWhatsappNotificationsEnabled(userId, enabled);
    }

    public static class StatusBlockedException extends RuntimeException {
        private String status;
        private String email;

        public StatusBlockedException(String message) {
            super(message);
        }

        public StatusBlockedException(String status, String message) {
            super(message);
            this.status = status;
        }

        public StatusBlockedException(String status, String message, String email) {
            super(message);
            this.status = status;
            this.email = email;
        }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
