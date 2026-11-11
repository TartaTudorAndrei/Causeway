package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.auth.RequestAccessDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.EmailVerificationToken;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.auth.EmailVerificationTokenRepository;
import com.charityapp.service.auth.AdminAuthService;
import com.charityapp.service.notification.AdminEmailService;
import com.charityapp.service.security.EmailExistenceValidator;
import com.charityapp.service.security.PasswordHasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AdminAuthServiceTest {
    private AdminUserRepository userRepository;
    private EmailVerificationTokenRepository tokenRepository;
    private com.charityapp.repository.auth.PasswordResetTokenRepository passwordResetTokenRepository;
    private PasswordHasher passwordHasher;
    private AdminEmailService emailService;
    private EmailExistenceValidator emailValidator;
    private com.charityapp.service.auth.TwoFactorAuthService twoFactorAuthService;
    private com.charityapp.service.auth.JwtService jwtService;
    private com.charityapp.service.security.RateLimiterService rateLimiterService;
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;
    private AdminAuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(AdminUserRepository.class);
        tokenRepository = mock(EmailVerificationTokenRepository.class);
        passwordResetTokenRepository = mock(com.charityapp.repository.auth.PasswordResetTokenRepository.class);
        passwordHasher = mock(PasswordHasher.class);
        emailService = mock(AdminEmailService.class);
        emailValidator = mock(EmailExistenceValidator.class);
        twoFactorAuthService = mock(com.charityapp.service.auth.TwoFactorAuthService.class);
        jwtService = new com.charityapp.service.auth.JwtService("test_super_secret_jwt_key_that_is_at_least_32_bytes_long_12345", 8);
        rateLimiterService = new com.charityapp.service.security.RateLimiterService();
        transactionTemplate = mock(org.springframework.transaction.support.TransactionTemplate.class);

        when(passwordHasher.hash(any())).thenReturn("hashed_pass");
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            org.springframework.transaction.support.TransactionCallback<?> cb = invocation.getArgument(0);
            return cb.doInTransaction(null);
        });

        authService = new AdminAuthService(
            userRepository,
            tokenRepository,
            passwordResetTokenRepository,
            passwordHasher,
            emailService,
            emailValidator,
            twoFactorAuthService,
            jwtService,
            rateLimiterService,
            new com.charityapp.service.security.PasswordPolicyValidator(),
            transactionTemplate
        );
    }

    @Test
    void testRequestAccessAndVerifyEmailFlow() {
        RequestAccessDTO dto = new RequestAccessDTO(
            "Ion Popescu", "ion@google.com", "Password123!", "+40740123456", "Interact", "Interact Community", "Test"
        );

        when(userRepository.findByEmail("ion@google.com")).thenReturn(Optional.empty());

        UUID userId = UUID.randomUUID();
        when(userRepository.save(any(AdminUser.class))).thenAnswer(invocation -> {
            AdminUser u = invocation.getArgument(0);
            u.setId(userId);
            return u;
        });

        ArgumentCaptor<EmailVerificationToken> tokenCaptor = ArgumentCaptor.forClass(EmailVerificationToken.class);
        ArgumentCaptor<String> emailBodyCaptor = ArgumentCaptor.forClass(String.class);

        authService.requestAccess(dto, "127.0.0.1", "JUnit", "http://localhost:5173");

        verify(tokenRepository).save(tokenCaptor.capture());
        verify(emailService).sendEmail(eq("ion@google.com"), anyString(), emailBodyCaptor.capture());

        EmailVerificationToken savedToken = tokenCaptor.getValue();
        assertNotNull(savedToken.getTokenHash());
        assertEquals(userId, savedToken.getAdminUserId());

        String emailBody = emailBodyCaptor.getValue();
        assertTrue(emailBody.contains("verifyToken="));

        // Extract rawToken from email link
        int tokenStart = emailBody.indexOf("verifyToken=") + "verifyToken=".length();
        int tokenEnd = emailBody.indexOf("'", tokenStart);
        if (tokenEnd == -1) tokenEnd = emailBody.indexOf("\"", tokenStart);
        String rawToken = emailBody.substring(tokenStart, tokenEnd);

        // Now test verifying with this rawToken
        when(tokenRepository.findByTokenHash(savedToken.getTokenHash())).thenReturn(Optional.of(savedToken));
        
        AdminUser savedUser = new AdminUser(
            "Ion Popescu", "ion@google.com", "hashed_pass", AdminStatus.PENDING_EMAIL_VERIFICATION, AdminRole.VOLUNTEER
        );
        savedUser.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(savedUser));

        assertDoesNotThrow(() -> authService.verifyEmail(rawToken, "127.0.0.1", "JUnit", "http://localhost:5173"));
        verify(userRepository).updateStatus(userId, AdminStatus.PENDING_APPROVAL);

        // Test idempotent subsequent verify call
        savedUser.setStatus(AdminStatus.PENDING_APPROVAL);
        assertDoesNotThrow(() -> authService.verifyEmail(rawToken, "127.0.0.1", "JUnit", "http://localhost:5173"));
    }

    @Test
    void testGenerateSessionResponseCreatesValidJwt() {
        UUID userId = UUID.randomUUID();
        AdminUser user = new AdminUser("Test User", "test@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        user.setId(userId);

        com.charityapp.dto.auth.LoginResponseDTO response = authService.generateSessionResponse(user, "127.0.0.1", "JUnit");

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertTrue(jwtService.isTokenValid(response.getToken()));
        assertEquals(userId, jwtService.extractUserId(response.getToken()));
        assertEquals("test@example.org", jwtService.extractEmail(response.getToken()));
        assertEquals("ADMIN", jwtService.extractRole(response.getToken()));
    }

    @Test
    void testForgotPasswordAndResetPasswordFlow() {
        UUID userId = UUID.randomUUID();
        AdminUser user = new AdminUser("Ion Popescu", "ion@example.com", "old_hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);

        when(userRepository.findByEmail("ion@example.com")).thenReturn(Optional.of(user));

        ArgumentCaptor<com.charityapp.model.auth.PasswordResetToken> tokenCaptor =
            ArgumentCaptor.forClass(com.charityapp.model.auth.PasswordResetToken.class);
        ArgumentCaptor<String> emailBodyCaptor = ArgumentCaptor.forClass(String.class);

        authService.forgotPassword("ion@example.com", "127.0.0.1", "JUnit", "http://localhost:5173");

        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        verify(emailService).sendEmail(eq("ion@example.com"), anyString(), emailBodyCaptor.capture());

        com.charityapp.model.auth.PasswordResetToken savedToken = tokenCaptor.getValue();
        assertNotNull(savedToken.getTokenHash());
        assertEquals(userId, savedToken.getAdminUserId());

        String emailBody = emailBodyCaptor.getValue();
        assertTrue(emailBody.contains("resetToken="));

        int tokenStart = emailBody.indexOf("resetToken=") + "resetToken=".length();
        int tokenEnd = emailBody.indexOf("'", tokenStart);
        if (tokenEnd == -1) tokenEnd = emailBody.indexOf("\"", tokenStart);
        String rawToken = emailBody.substring(tokenStart, tokenEnd);

        when(passwordResetTokenRepository.findByTokenHash(savedToken.getTokenHash())).thenReturn(Optional.of(savedToken));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertTrue(authService.validateResetToken(rawToken));

        assertDoesNotThrow(() -> authService.resetPassword(rawToken, "NewSecretPassword123!", "127.0.0.1", "JUnit"));

        verify(userRepository).updatePassword(eq(userId), eq("hashed_pass"));
        verify(passwordResetTokenRepository, times(2)).deleteByUserId(userId);

        // After reset, token is no longer in repo
        when(passwordResetTokenRepository.findByTokenHash(savedToken.getTokenHash())).thenReturn(Optional.empty());
        assertFalse(authService.validateResetToken(rawToken));
        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(rawToken, "AnotherPassword123!", "127.0.0.1", "JUnit"));
    }

    @Test
    void testRequestAccessRejectsMissingPassword() {
        RequestAccessDTO dtoWithoutPassword = new RequestAccessDTO(
            "Ion Popescu", "ion@google.com", null, "+40740123456", "Interact", "Interact Community", "Test"
        );
        assertThrows(IllegalArgumentException.class, () ->
            authService.requestAccess(dtoWithoutPassword, "127.0.0.1", "JUnit", "http://localhost:5173")
        );

        RequestAccessDTO dtoWithBlankPassword = new RequestAccessDTO(
            "Ion Popescu", "ion@google.com", "   ", "+40740123456", "Interact", "Interact Community", "Test"
        );
        assertThrows(IllegalArgumentException.class, () ->
            authService.requestAccess(dtoWithBlankPassword, "127.0.0.1", "JUnit", "http://localhost:5173")
        );
    }

    @Test
    void testGetOrCreateUserForPublicSignupRejectsMissingPassword() {
        assertThrows(IllegalArgumentException.class, () ->
            authService.getOrCreateUserForPublicSignup(
                "Ion Popescu", "ion@google.com", null, "+40740123456", "Interact", "Interact Community", "127.0.0.1", "JUnit", "http://localhost:5173"
            )
        );
        assertThrows(IllegalArgumentException.class, () ->
            authService.getOrCreateUserForPublicSignup(
                "Ion Popescu", "ion@google.com", "  ", "+40740123456", "Interact", "Interact Community", "127.0.0.1", "JUnit", "http://localhost:5173"
            )
        );
    }

    @Test
    void testCreateUserRejectsMissingPassword() {
        UUID actorId = UUID.randomUUID();
        AdminUser adminActor = new AdminUser("Admin", "admin@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(adminActor));

        com.charityapp.dto.admin.CreateAdminUserDTO dto = new com.charityapp.dto.admin.CreateAdminUserDTO();
        dto.setEmail("newuser@example.org");
        dto.setFullName("New User");
        dto.setPassword(null);

        assertThrows(IllegalArgumentException.class, () ->
            authService.createUser(dto, actorId, "127.0.0.1", "JUnit")
        );
    }

    @Test
    void testStateTransitionsRejectNonAdminActor() {
        UUID volunteerActorId = UUID.randomUUID();
        AdminUser volunteerActor = new AdminUser("Volunteer", "volunteer@example.org", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        when(userRepository.findById(volunteerActorId)).thenReturn(Optional.of(volunteerActor));

        UUID targetUserId = UUID.randomUUID();

        // approveUser throws FORBIDDEN
        org.springframework.web.server.ResponseStatusException ex1 = assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> authService.approveUser(targetUserId, volunteerActorId, "127.0.0.1", "JUnit")
        );
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex1.getStatusCode());

        // rejectUser throws FORBIDDEN
        org.springframework.web.server.ResponseStatusException ex2 = assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> authService.rejectUser(targetUserId, "Reason", volunteerActorId, "127.0.0.1", "JUnit")
        );
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex2.getStatusCode());

        // suspendUser throws FORBIDDEN
        org.springframework.web.server.ResponseStatusException ex3 = assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> authService.suspendUser(targetUserId, volunteerActorId, "127.0.0.1", "JUnit")
        );
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex3.getStatusCode());

        // deleteUser throws FORBIDDEN
        org.springframework.web.server.ResponseStatusException exDelete = assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> authService.deleteUser(targetUserId, volunteerActorId, "127.0.0.1", "JUnit")
        );
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exDelete.getStatusCode());

        // updateUserRoles throws FORBIDDEN
        org.springframework.web.server.ResponseStatusException ex4 = assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> authService.updateUserRoles(targetUserId, java.util.List.of("ADMIN"), volunteerActorId, "127.0.0.1", "JUnit")
        );
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex4.getStatusCode());
    }

    @Test
    void testStateTransitionsRejectUnknownActor() {
        UUID unknownActorId = UUID.randomUUID();
        when(userRepository.findById(unknownActorId)).thenReturn(Optional.empty());

        UUID targetUserId = UUID.randomUUID();

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> authService.approveUser(targetUserId, unknownActorId, "127.0.0.1", "JUnit")
        );
        assertEquals(org.springframework.http.HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void testAdminUserJsonSerializationHidesPasswordHashAndTwoFactorSecret() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.findAndRegisterModules();
        AdminUser user = new AdminUser("Secret User", "secret@example.org", "super_secret_hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        user.setTwoFactorSecret("JBSWY3DPEHPK3PXP");

        String json = mapper.writeValueAsString(user);

        assertFalse(json.contains("super_secret_hash"), "passwordHash must not appear in serialized JSON");
        assertFalse(json.contains("passwordHash"), "passwordHash field must be ignored");
        assertFalse(json.contains("JBSWY3DPEHPK3PXP"), "twoFactorSecret value must not appear in serialized JSON");
        assertFalse(json.contains("twoFactorSecret"), "twoFactorSecret field must be ignored");
    }

    @Test
    void testUpdateUserRolesWithCustomRole() {
        UUID actorId = UUID.randomUUID();
        AdminUser adminActor = new AdminUser("Admin", "admin@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(adminActor));

        UUID targetUserId = UUID.randomUUID();
        AdminUser targetUser = new AdminUser("Custom Target", "target@example.org", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));

        authService.updateUserRoles(targetUserId, List.of("CUSTOM_ROLE_1", "HR_MEMBER"), actorId, "127.0.0.1", "JUnit");

        verify(userRepository).updateRoles(eq(targetUserId), eq("CUSTOM_ROLE_1"), eq(List.of("CUSTOM_ROLE_1", "HR_MEMBER")));
        verify(userRepository).incrementTokenVersion(targetUserId);
    }

    @Test
    void testDeleteUserSuccess() {
        UUID actorId = UUID.randomUUID();
        AdminUser adminActor = new AdminUser("Admin", "admin@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(adminActor));

        UUID targetUserId = UUID.randomUUID();
        AdminUser targetUser = new AdminUser("Volunteer User", "volunteer@example.org", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));

        authService.deleteUser(targetUserId, actorId, "127.0.0.1", "JUnit");

        verify(userRepository).deleteById(targetUserId);
    }

    @Test
    void testDeleteUserCannotDeleteSelf() {
        UUID actorId = UUID.randomUUID();
        AdminUser adminActor = new AdminUser("Admin", "admin@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(adminActor));

        assertThrows(IllegalArgumentException.class, () -> authService.deleteUser(actorId, actorId, "127.0.0.1", "JUnit"));
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void testDeleteUserCannotDeleteAdmin() {
        UUID actorId = UUID.randomUUID();
        AdminUser adminActor = new AdminUser("Admin 1", "admin1@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(adminActor));

        UUID targetAdminId = UUID.randomUUID();
        AdminUser targetAdmin = new AdminUser("Admin 2", "admin2@example.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        when(userRepository.findById(targetAdminId)).thenReturn(Optional.of(targetAdmin));

        assertThrows(IllegalArgumentException.class, () -> authService.deleteUser(targetAdminId, actorId, "127.0.0.1", "JUnit"));
        verify(userRepository, never()).deleteById(any());
    }
}
