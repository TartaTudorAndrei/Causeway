package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.dto.auth.TwoFactorSetupConfirmRequestDTO;
import com.charityapp.dto.auth.TwoFactorSetupInitiateResponseDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.TwoFactorCode;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.repository.auth.TwoFactorCodeRepository;
import com.charityapp.service.notification.AdminEmailService;
import com.charityapp.service.security.PasswordHasher;
import com.charityapp.service.security.RateLimiterService;
import com.charityapp.service.auth.TwoFactorAuthService;
import com.charityapp.util.TotpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TwoFactorAuthServiceTest {

    private AdminUserRepository userRepository;
    private TwoFactorCodeRepository codeRepository;
    private AuditLogRepository auditLogRepository;
    private AdminEmailService emailService;
    private PasswordHasher passwordHasher;
    private RateLimiterService rateLimiterService;
    private TwoFactorAuthService twoFactorService;

    @BeforeEach
    void setUp() {
        userRepository = mock(AdminUserRepository.class);
        codeRepository = mock(TwoFactorCodeRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        emailService = mock(AdminEmailService.class);
        passwordHasher = mock(PasswordHasher.class);
        rateLimiterService = new RateLimiterService();

        twoFactorService = new TwoFactorAuthService(
            userRepository,
            codeRepository,
            auditLogRepository,
            emailService,
            passwordHasher,
            rateLimiterService
        );
    }

    @Test
    void testCreateLoginChallenge() {
        AdminUser user = new AdminUser("Test User", "user@example.org", "pass", AdminStatus.APPROVED, AdminRole.ADMIN);
        user.setId(UUID.randomUUID());
        user.setTwoFactorEnabled(true);
        user.setTwoFactorMethod("EMAIL");

        LoginResponseDTO challenge = twoFactorService.createLoginChallenge(user, "127.0.0.1", "JUnit");

        assertTrue(challenge.isTwoFactorRequired());
        assertNotNull(challenge.getTwoFactorSessionToken());
        assertTrue(challenge.getTwoFactorMethods().contains("EMAIL"));
        assertNotNull(challenge.getMaskedEmail());

        verify(codeRepository).save(any(TwoFactorCode.class));
        verify(emailService).sendEmail(eq("user@example.org"), anyString(), anyString());
    }

    @Test
    void testVerifyLoginTotp() {
        UUID userId = UUID.randomUUID();
        String secret = TotpUtil.generateSecret();
        AdminUser user = new AdminUser("Test User", "user@example.org", "pass", AdminStatus.APPROVED, AdminRole.ADMIN);
        user.setId(userId);
        user.setTwoFactorEnabled(true);
        user.setTwoFactorSecret(secret);
        user.setTwoFactorMethod("TOTP");

        String sessionToken = "session-123";
        TwoFactorCode codeEntity = new TwoFactorCode(userId, "hash", "LOGIN", sessionToken, java.time.LocalDateTime.now().plusMinutes(10));
        codeEntity.setId(UUID.randomUUID());

        when(codeRepository.findActiveBySessionToken(sessionToken)).thenReturn(Optional.of(codeEntity));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        String totp = TotpUtil.generateCode(secret, System.currentTimeMillis() / 1000L);

        AdminUser verifiedUser = twoFactorService.verifyLogin(sessionToken, totp, "TOTP", "127.0.0.1", "JUnit");
        assertEquals(userId, verifiedUser.getId());
        verify(codeRepository).markUsed(codeEntity.getId());
    }
}
