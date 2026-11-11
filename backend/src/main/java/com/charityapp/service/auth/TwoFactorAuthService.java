package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.auth.*;
import com.charityapp.dto.admin.*;
import com.charityapp.dto.account.*;
import com.charityapp.dto.finance.*;
import com.charityapp.dto.notification.*;
import com.charityapp.dto.common.*;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.model.auth.TwoFactorCode;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.repository.auth.TwoFactorCodeRepository;
import com.charityapp.util.TotpUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TwoFactorAuthService {
    private final AdminUserRepository userRepository;
    private final TwoFactorCodeRepository codeRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminEmailService emailService;
    private final PasswordHasher passwordHasher;
    private final RateLimiterService rateLimiterService;
    private final com.charityapp.config.TenantProperties tenantProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public TwoFactorAuthService(AdminUserRepository userRepository,
                                TwoFactorCodeRepository codeRepository,
                                AuditLogRepository auditLogRepository,
                                AdminEmailService emailService,
                                PasswordHasher passwordHasher,
                                RateLimiterService rateLimiterService) {
        this(userRepository, codeRepository, auditLogRepository, emailService, passwordHasher, rateLimiterService, new com.charityapp.config.TenantProperties());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public TwoFactorAuthService(AdminUserRepository userRepository,
                                TwoFactorCodeRepository codeRepository,
                                AuditLogRepository auditLogRepository,
                                AdminEmailService emailService,
                                PasswordHasher passwordHasher,
                                RateLimiterService rateLimiterService,
                                com.charityapp.config.TenantProperties tenantProperties) {
        this.userRepository = userRepository;
        this.codeRepository = codeRepository;
        this.auditLogRepository = auditLogRepository;
        this.emailService = emailService;
        this.passwordHasher = passwordHasher;
        this.rateLimiterService = rateLimiterService;
        this.tenantProperties = tenantProperties != null ? tenantProperties : new com.charityapp.config.TenantProperties();
    }

    public TwoFactorStatusResponseDTO getStatus(UUID userId) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));
        
        List<String> methods = new ArrayList<>();
        methods.add("EMAIL");
        methods.add("TOTP");
        methods.add("BOTH");

        return new TwoFactorStatusResponseDTO(
            user.isTwoFactorEnabled(),
            user.getTwoFactorMethod() != null ? user.getTwoFactorMethod() : "NONE",
            methods
        );
    }

    @Transactional
    public LoginResponseDTO createLoginChallenge(AdminUser user, String ip, String ua) {
        String sessionToken = UUID.randomUUID().toString();
        codeRepository.invalidateUserCodes(user.getId(), "LOGIN");

        String rawCode = generate6DigitCode();
        String codeHash = hashCode(rawCode);

        TwoFactorCode codeEntity = new TwoFactorCode(
            user.getId(),
            codeHash,
            "LOGIN",
            sessionToken,
            LocalDateTime.now().plusMinutes(10)
        );
        codeRepository.save(codeEntity);

        List<String> availableMethods = new ArrayList<>();
        String userMethod = user.getTwoFactorMethod();
        if ("TOTP".equalsIgnoreCase(userMethod)) {
            availableMethods.add("TOTP");
            availableMethods.add("EMAIL"); // fallback
        } else {
            availableMethods.add("EMAIL");
            availableMethods.add("TOTP");
        }

        // Always send email OTP immediately so user has code waiting in inbox
        sendOtpEmail(user.getEmail(), user.getFullName(), rawCode);

        recordAudit(user.getId(), "2FA_CHALLENGE_ISSUED", user.getId(), ip, ua, "Sesiune 2FA inițiată pentru " + user.getEmail());

        return LoginResponseDTO.twoFactorRequired(
            sessionToken,
            availableMethods,
            maskEmail(user.getEmail())
        );
    }

    @Transactional
    public void sendLoginEmailOtp(String sessionToken, String ip, String ua) {
        TwoFactorCode existing = codeRepository.findActiveBySessionToken(sessionToken)
            .orElseThrow(() -> new IllegalArgumentException("Sesiunea de autentificare 2FA a expirat sau este invalidă."));

        AdminUser user = userRepository.findById(existing.getAdminUserId())
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        codeRepository.invalidateSession(sessionToken);

        String rawCode = generate6DigitCode();
        String codeHash = hashCode(rawCode);

        TwoFactorCode newCode = new TwoFactorCode(
            user.getId(),
            codeHash,
            "LOGIN",
            sessionToken,
            LocalDateTime.now().plusMinutes(10)
        );
        codeRepository.save(newCode);

        sendOtpEmail(user.getEmail(), user.getFullName(), rawCode);

        recordAudit(user.getId(), "2FA_EMAIL_OTP_SENT", user.getId(), ip, ua, "Cod OTP 2FA retransmis pe email");
    }

    @Transactional
    public AdminUser verifyLogin(String sessionToken, String code, String method, String ip, String ua) {
        if (sessionToken == null || sessionToken.isBlank() || code == null || code.isBlank()) {
            throw new IllegalArgumentException("Token-ul de sesiune și codul de verificare sunt obligatorii.");
        }

        if (!rateLimiterService.isTwoFactorAllowed(sessionToken)) {
            codeRepository.invalidateSession(sessionToken);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Prea multe încercări incorecte. Sesiunea 2FA a fost invalidată. Vă rugăm să vă reconectați.");
        }

        TwoFactorCode session = codeRepository.findActiveBySessionToken(sessionToken)
            .orElseThrow(() -> new IllegalArgumentException("Sesiunea 2FA a expirat sau este invalidă. Vă rugăm să reîncercați autentificarea."));

        AdminUser user = userRepository.findById(session.getAdminUserId())
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        String cleanCode = code.trim().replaceAll("\\s+", "");
        boolean isValid = false;

        // 1. Check TOTP Authenticator code if method is TOTP or if user has TOTP secret
        if (("TOTP".equalsIgnoreCase(method) || method == null) && user.getTwoFactorSecret() != null && !user.getTwoFactorSecret().isBlank()) {
            isValid = TotpUtil.verifyCode(user.getTwoFactorSecret(), cleanCode);
        }

        // 2. Check Email OTP code if method is EMAIL or if TOTP failed (as fallback)
        if (!isValid) {
            String incomingHash = hashCode(cleanCode);
            if (incomingHash.equals(session.getCodeHash())) {
                isValid = true;
            }
        }

        if (!isValid) {
            int failures = rateLimiterService.recordTwoFactorFailure(sessionToken);
            recordAudit(user.getId(), "2FA_VERIFY_FAILED", user.getId(), ip, ua, "Cod 2FA incorect pentru " + user.getEmail());

            if (failures >= RateLimiterService.TWO_FACTOR_MAX_FAILURES) {
                codeRepository.invalidateSession(sessionToken);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Prea multe încercări incorecte. Sesiunea 2FA a fost invalidată. Vă rugăm să vă reconectați.");
            }

            throw new IllegalArgumentException("Codul de verificare 2FA este incorect sau a expirat.");
        }

        rateLimiterService.resetTwoFactor(sessionToken);
        codeRepository.markUsed(session.getId());

        recordAudit(user.getId(), "2FA_VERIFY_SUCCESS", user.getId(), ip, ua, "Autentificare 2FA reușită pentru " + user.getEmail());

        return user;
    }

    @Transactional
    public TwoFactorSetupInitiateResponseDTO initiateSetup(UUID userId) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        String secret = TotpUtil.generateSecret();
        String issuer = (tenantProperties != null && tenantProperties.getIntegrations() != null && tenantProperties.getIntegrations().getTotpIssuer() != null)
                ? tenantProperties.getIntegrations().getTotpIssuer() : "Causeway";
        String otpAuthUrl = TotpUtil.getOtpAuthUrl(user.getEmail(), secret, issuer);

        codeRepository.invalidateUserCodes(userId, "SETUP");

        String rawCode = generate6DigitCode();
        String codeHash = hashCode(rawCode);

        TwoFactorCode codeEntity = new TwoFactorCode(
            userId,
            codeHash,
            "SETUP",
            null,
            LocalDateTime.now().plusMinutes(15)
        );
        codeRepository.save(codeEntity);

        sendSetupOtpEmail(user.getEmail(), user.getFullName(), rawCode);

        List<String> methods = List.of("TOTP", "EMAIL", "BOTH");
        return new TwoFactorSetupInitiateResponseDTO(secret, otpAuthUrl, user.getEmail(), methods);
    }

    @Transactional
    public void resendSetupEmailOtp(UUID userId) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        codeRepository.invalidateUserCodes(userId, "SETUP");

        String rawCode = generate6DigitCode();
        String codeHash = hashCode(rawCode);

        TwoFactorCode codeEntity = new TwoFactorCode(
            userId,
            codeHash,
            "SETUP",
            null,
            LocalDateTime.now().plusMinutes(15)
        );
        codeRepository.save(codeEntity);

        sendSetupOtpEmail(user.getEmail(), user.getFullName(), rawCode);
    }

    @Transactional
    public void confirmSetup(UUID userId, TwoFactorSetupConfirmRequestDTO dto, String ip, String ua) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        String method = dto.getMethod() != null ? dto.getMethod().toUpperCase() : "TOTP";
        String cleanCode = dto.getCode().trim().replaceAll("\\s+", "");

        if ("TOTP".equals(method) || "BOTH".equals(method)) {
            if (dto.getSecret() == null || dto.getSecret().isBlank()) {
                throw new IllegalArgumentException("Cheia secretă este obligatorie pentru configurarea Authenticator.");
            }
            boolean totpValid = TotpUtil.verifyCode(dto.getSecret(), cleanCode);
            if (!totpValid) {
                // If user tried email OTP during setup
                String incomingHash = hashCode(cleanCode);
                boolean emailValid = codeRepository.findActiveCode(userId, incomingHash, "SETUP").isPresent();
                if (!emailValid) {
                    throw new IllegalArgumentException("Codul introdus din aplicația Authenticator este incorect.");
                }
            }
            userRepository.updateTwoFactor(userId, true, dto.getSecret(), method);
        } else if ("EMAIL".equals(method)) {
            String incomingHash = hashCode(cleanCode);
            TwoFactorCode activeCode = codeRepository.findActiveCode(userId, incomingHash, "SETUP")
                .orElseThrow(() -> new IllegalArgumentException("Codul de confirmare trimis pe email este incorect sau a expirat."));
            codeRepository.markUsed(activeCode.getId());
            userRepository.updateTwoFactor(userId, true, null, "EMAIL");
        } else {
            throw new IllegalArgumentException("Metodă 2FA nesuportată: " + method);
        }

        recordAudit(userId, "2FA_ENABLED", userId, ip, ua, "2FA activat cu metoda: " + method + " pentru " + user.getEmail());
    }

    @Transactional
    public void disable2FA(UUID userId, TwoFactorDisableRequestDTO dto, String ip, String ua) {
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilizatorul nu a fost găsit."));

        if (!passwordHasher.verify(dto.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Parola introdusă este incorectă.");
        }

        userRepository.updateTwoFactor(userId, false, null, "NONE");
        userRepository.incrementTokenVersion(userId);
        codeRepository.invalidateUserCodes(userId, "LOGIN");
        codeRepository.invalidateUserCodes(userId, "SETUP");

        recordAudit(userId, "2FA_DISABLED", userId, ip, ua, "2FA a fost dezactivat pentru " + user.getEmail());
    }

    private void recordAudit(UUID actorId, String action, UUID targetId, String ip, String ua, String details) {
        if (auditLogRepository == null) return;
        try {
            AuditLog log = new AuditLog();
            log.setId(UUID.randomUUID());
            log.setActorId(actorId);
            String sysEmail = (tenantProperties != null && tenantProperties.getIntegrations() != null && tenantProperties.getIntegrations().getContactEmail() != null)
                    ? tenantProperties.getIntegrations().getContactEmail() : "system@charity.org";
            log.setActorEmail(sysEmail);
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

    private void sendOtpEmail(String recipientEmail, String recipientName, String code) {
        String shorthand = (tenantProperties != null && tenantProperties.getIdentity() != null)
                ? tenantProperties.getIdentity().getShorthand() : "App";
        String body = String.format(
            "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
            + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Cod de Autentificare 2FA - %s</h2>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Bună %s,</p>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Pentru a finaliza conectarea în contul %s Admin, utilizați următorul cod de securitate:</p>"
            + "<div style='margin: 28px 0; text-align: center;'>"
            + "<span style='background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 26px; font-weight: bold; letter-spacing: 6px; display: inline-block; font-family: monospace;'>%s</span>"
            + "</div>"
            + "<p style='color: #a1a1aa; font-size: 12px; line-height: 1.5;'>Acest cod este valabil timp de <strong>10 minute</strong>. Nu divulgați nimănui acest cod de securitate.</p>"
            + "<p style='color: #71717a; font-size: 11px; margin-top: 20px;'>Dacă nu ați inițiat această conectare, vă recomandăm să vă schimbați imediat parola contului.</p>"
            + "</div>",
            shorthand,
            recipientName != null ? recipientName : "Administrator",
            shorthand,
            code
        );
        emailService.sendEmail(recipientEmail, "Cod securitate 2FA - " + shorthand + " Admin", body);
    }

    private void sendSetupOtpEmail(String recipientEmail, String recipientName, String code) {
        String shorthand = (tenantProperties != null && tenantProperties.getIdentity() != null)
                ? tenantProperties.getIdentity().getShorthand() : "App";
        String body = String.format(
            "<div style='font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #18181b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;'>"
            + "<h2 style='color: #ffffff; margin-top: 0; margin-bottom: 16px;'>Configurare Autentificare în Doi Pași (2FA)</h2>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Bună %s,</p>"
            + "<p style='color: #d4d4d8; font-size: 14px; line-height: 1.6;'>Ați solicitat activarea autentificării în doi pași (2FA). Codul dumneavoastră de confirmare este:</p>"
            + "<div style='margin: 28px 0; text-align: center;'>"
            + "<span style='background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 26px; font-weight: bold; letter-spacing: 6px; display: inline-block; font-family: monospace;'>%s</span>"
            + "</div>"
            + "<p style='color: #a1a1aa; font-size: 12px; line-height: 1.5;'>Codul este valabil timp de <strong>15 minute</strong>.</p>"
            + "</div>",
            recipientName != null ? recipientName : "Administrator",
            code
        );
        emailService.sendEmail(recipientEmail, "Confirmare activare 2FA - " + shorthand + " Admin", body);
    }

    private String generate6DigitCode() {
        int num = secureRandom.nextInt(900_000) + 100_000;
        return String.valueOf(num);
    }

    private String hashCode(String rawCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawCode.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Eroare la calcularea hash-ului", e);
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf('@');
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (name.length() <= 2) {
            return name.charAt(0) + "***" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }
}
