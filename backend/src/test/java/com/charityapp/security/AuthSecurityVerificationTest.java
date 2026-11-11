package com.charityapp.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.charityapp.config.RequirePermission;
import com.charityapp.config.SecurityAspect;
import com.charityapp.controller.test.TestController;
import com.charityapp.controller.test.TestWebhookController;
import com.charityapp.dto.auth.LoginRequestDTO;
import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.model.auth.*;
import com.charityapp.model.admin.*;
import com.charityapp.model.finance.*;
import com.charityapp.model.notification.*;
import com.charityapp.repository.auth.*;
import com.charityapp.repository.admin.*;
import com.charityapp.repository.finance.*;
import com.charityapp.repository.notification.*;
import com.charityapp.repository.sync.*;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;
import io.jsonwebtoken.Claims;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Authentication and Authorization Security Verification Test Suite.
 */
class AuthSecurityVerificationTest {

    private SecurityEvaluator securityEvaluator;
    private JwtService jwtService;
    private AdminUserRepository userRepository;
    private TwoFactorCodeRepository codeRepository;
    private AuditLogRepository auditLogRepository;
    private AdminEmailService emailService;
    private PasswordHasher passwordHasher;
    private RateLimiterService rateLimiterService;
    private TwoFactorAuthService twoFactorAuthService;
    private AdminAuthService authService;
    private GoogleAuthService googleAuthService;
    private GoogleIdTokenVerifier googleVerifier;
    private SecurityAspect securityAspect;
    private ObjectMapper objectMapper;

    private static final String TEST_SECRET = "charity_test_secret_key_for_jwt_which_is_at_least_32_bytes_long";
    private static final String PREVIOUS_SECRET = "charity_test_previous_key_for_jwt_32_bytes";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        userRepository = mock(AdminUserRepository.class);
        codeRepository = mock(TwoFactorCodeRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        emailService = mock(AdminEmailService.class);
        passwordHasher = new PasswordHasher();
        rateLimiterService = new RateLimiterService();
        jwtService = new JwtService(TEST_SECRET, 8);
        securityEvaluator = new SecurityEvaluator(userRepository);
        securityAspect = new SecurityAspect(securityEvaluator, jwtService, userRepository);

        twoFactorAuthService = new TwoFactorAuthService(
                userRepository,
                codeRepository,
                auditLogRepository,
                emailService,
                passwordHasher,
                rateLimiterService
        );

        TransactionTemplate transactionTemplate = mock(TransactionTemplate.class);
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            org.springframework.transaction.support.TransactionCallback<?> cb = invocation.getArgument(0);
            return cb.doInTransaction(null);
        });

        EmailVerificationTokenRepository tokenRepository = mock(EmailVerificationTokenRepository.class);
        PasswordResetTokenRepository passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
        EmailExistenceValidator emailValidator = mock(EmailExistenceValidator.class);

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
                new PasswordPolicyValidator(),
                transactionTemplate
        );

        googleVerifier = mock(GoogleIdTokenVerifier.class);
        googleAuthService = new GoogleAuthService(googleVerifier, null, userRepository, authService);
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private RequirePermission createRequirePermission(String code) {
        RequirePermission perm = mock(RequirePermission.class);
        when(perm.code()).thenReturn(code);
        when(perm.scopeType()).thenReturn(ScopeType.GLOBAL);
        when(perm.scopeIdParam()).thenReturn("");
        return perm;
    }

    // ==========================================
    // Endpoint Authorization Tests
    // ==========================================

    @Test
    @DisplayName("Accessing admin users endpoint without token throws 401 Unauthorized")
    void testAdminUsersWithoutToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission perm = createRequirePermission("admin:read");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                securityAspect.checkPermission(joinPoint, perm)
        );
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    @DisplayName("Accessing pending admin users endpoint without token throws 401 Unauthorized")
    void testAdminPendingWithoutToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission perm = createRequirePermission("admin:read");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                securityAspect.checkPermission(joinPoint, perm)
        );
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    @DisplayName("Modifying user role with VOLUNTEER token throws 403 Forbidden")
    void testVolunteerCannotUpdateRole() {
        UUID volunteerId = UUID.randomUUID();
        AdminUser volunteer = new AdminUser("Volunteer", "vol@example.org", "pass", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        volunteer.setId(volunteerId);
        volunteer.setTokenVersion(0);

        when(userRepository.findById(volunteerId)).thenReturn(Optional.of(volunteer));

        String token = jwtService.generateToken(volunteerId, volunteer.getEmail(), "VOLUNTEER", List.of("VOLUNTEER"), 0);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission perm = createRequirePermission("admin:write");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                securityAspect.checkPermission(joinPoint, perm)
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("Approving user with VOLUNTEER token throws 403 Forbidden")
    void testVolunteerCannotApproveUser() {
        UUID volunteerId = UUID.randomUUID();
        AdminUser volunteer = new AdminUser("Volunteer", "vol@example.org", "pass", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        volunteer.setId(volunteerId);
        volunteer.setTokenVersion(0);

        when(userRepository.findById(volunteerId)).thenReturn(Optional.of(volunteer));

        String token = jwtService.generateToken(volunteerId, volunteer.getEmail(), "VOLUNTEER", List.of("VOLUNTEER"), 0);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission perm = createRequirePermission("admin:write");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                securityAspect.checkPermission(joinPoint, perm)
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("TestController is restricted to dev and test profiles only")
    void testTestControllerProfileRestricted() {
        Profile profileAnnotation = TestController.class.getAnnotation(Profile.class);
        assertNotNull(profileAnnotation, "TestController must have @Profile annotation");
        List<String> profiles = Arrays.asList(profileAnnotation.value());
        assertTrue(profiles.contains("dev"));
        assertTrue(profiles.contains("test"));
        assertFalse(profiles.contains("prod"), "TestController must never be active in prod profile");
    }

    @Test
    @DisplayName("TestWebhookController is restricted to dev and test profiles only")
    void testTestWebhookControllerProfileRestricted() {
        Profile profileAnnotation = TestWebhookController.class.getAnnotation(Profile.class);
        assertNotNull(profileAnnotation, "TestWebhookController must have @Profile annotation");
        List<String> profiles = Arrays.asList(profileAnnotation.value());
        assertTrue(profiles.contains("dev"));
        assertTrue(profiles.contains("test"));
        assertFalse(profiles.contains("prod"), "TestWebhookController must never be active in prod profile");
    }

    @Test
    @DisplayName("Accessing donations endpoint without token throws 401 Unauthorized")
    void testDonationsWithoutToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission perm = createRequirePermission("donations:read");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                securityAspect.checkPermission(joinPoint, perm)
        );
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    @DisplayName("AdminUser JSON serialization excludes passwordHash and twoFactorSecret via @JsonIgnore")
    void testAdminUserCredentialsNotSerialized() throws Exception {
        AdminUser user = new AdminUser("Admin", "admin@example.org", "600000:salt:hashedpass", AdminStatus.APPROVED, AdminRole.ADMIN);
        user.setId(UUID.randomUUID());
        user.setTwoFactorSecret("JBSWY3DPEHPK3PXP");

        String json = objectMapper.writeValueAsString(user);

        assertFalse(json.contains("passwordHash"), "JSON output must NOT contain passwordHash property");
        assertFalse(json.contains("600000:salt:hashedpass"), "JSON output must NOT contain raw password hash string");
        assertFalse(json.contains("twoFactorSecret"), "JSON output must NOT contain twoFactorSecret property");
        assertFalse(json.contains("JBSWY3DPEHPK3PXP"), "JSON output must NOT contain 2FA secret key string");
        assertTrue(json.contains("admin@example.org"), "JSON output should contain safe user metadata");
    }

    // ==========================================
    // Google Authentication Tests
    // ==========================================

    @Test
    @DisplayName("Google Sign-In with new unregistered user returns NEEDS_REGISTRATION")
    void testGoogleSignInUnregisteredUser() throws Exception {
        String googleToken = "unregistered-google-id-token";
        GoogleIdToken idToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("newuser@gmail.com");
        payload.setEmailVerified(true);
        payload.set("name", "New Google User");
        when(idToken.getPayload()).thenReturn(payload);
        when(googleVerifier.verify(googleToken)).thenReturn(idToken);
        when(userRepository.findByEmail("newuser@gmail.com")).thenReturn(Optional.empty());

        AdminAuthService.StatusBlockedException ex = assertThrows(
                AdminAuthService.StatusBlockedException.class,
                () -> googleAuthService.authenticateGoogleUser(googleToken, "10.0.0.1", "JUnit")
        );

        assertEquals("NEEDS_REGISTRATION", ex.getStatus());
        assertEquals("newuser@gmail.com", ex.getEmail());
    }

    @Test
    @DisplayName("Google Sign-In with approved admin generates valid session")
    void testGoogleSignInApprovedAdmin() throws Exception {
        String googleToken = "approved-admin-token";
        GoogleIdToken idToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("lead@example.org");
        payload.setEmailVerified(true);
        payload.set("name", "Lead Admin");
        when(idToken.getPayload()).thenReturn(payload);
        when(googleVerifier.verify(googleToken)).thenReturn(idToken);

        AdminUser approvedAdmin = new AdminUser("Lead Admin", "lead@example.org", "GOOGLE_OAUTH_USER", AdminStatus.APPROVED, AdminRole.ADMIN);
        UUID adminId = UUID.randomUUID();
        approvedAdmin.setId(adminId);
        when(userRepository.findByEmail("lead@example.org")).thenReturn(Optional.of(approvedAdmin));

        AdminAuthService mockAuthService = mock(AdminAuthService.class);
        GoogleAuthService gAuthService = new GoogleAuthService(googleVerifier, null, userRepository, mockAuthService);

        LoginResponseDTO expectedSession = new LoginResponseDTO(
                "mock.jwt.token",
                "2026-08-27T23:59:59",
                new LoginResponseDTO.UserDetailsDTO("Lead Admin", "lead@example.org", "ADMIN", List.of("ADMIN"), "", "", "")
        );
        when(mockAuthService.generateSessionResponse(eq(approvedAdmin), eq("10.0.0.1"), eq("JUnit"))).thenReturn(expectedSession);

        LoginResponseDTO actualSession = gAuthService.authenticateGoogleUser(googleToken, "10.0.0.1", "JUnit");
        assertNotNull(actualSession);
        assertEquals("mock.jwt.token", actualSession.getToken());
        assertEquals("lead@example.org", actualSession.getUser().getEmail());
    }

    @Test
    @DisplayName("User with auth_provider=GOOGLE cannot login via password endpoint")
    void testGoogleOnlyUserCannotLoginWithPassword() {
        AdminUser googleUser = new AdminUser("Google User", "guser@example.org", null, AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        googleUser.setAuthProvider(AuthProvider.GOOGLE);
        when(userRepository.findByEmail("guser@example.org")).thenReturn(Optional.of(googleUser));

        LoginRequestDTO req = new LoginRequestDTO();
        req.setEmail("guser@example.org");
        req.setPassword("AnyPassword123!");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                authService.login(req, "127.0.0.1", "test-agent")
        );

        assertTrue(ex.getMessage().contains("Google"));
    }

    // ==========================================
    // 2FA Session Invalidation Tests
    // ==========================================

    @Test
    @DisplayName("3 failed 2FA attempts invalidates session and rejects further verify calls")
    void testTwoFactorRateLimitingAndSessionInvalidation() {
        String sessionToken = UUID.randomUUID().toString();
        UUID userId = UUID.randomUUID();

        AdminUser user = new AdminUser("Test", "test@example.org", "pass", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);
        user.setTwoFactorSecret(null);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        TwoFactorCode code = new TwoFactorCode(userId, "hashed_correct_code", "LOGIN", sessionToken, LocalDateTime.now().plusMinutes(10));
        when(codeRepository.findActiveBySessionToken(sessionToken)).thenReturn(Optional.of(code));

        // 1st failed attempt
        assertThrows(IllegalArgumentException.class, () ->
                twoFactorAuthService.verifyLogin(sessionToken, "wrong1", "EMAIL", "1.1.1.1", "agent")
        );

        // 2nd failed attempt
        assertThrows(IllegalArgumentException.class, () ->
                twoFactorAuthService.verifyLogin(sessionToken, "wrong2", "EMAIL", "1.1.1.1", "agent")
        );

        // 3rd failed attempt -> triggers session invalidation and 401 ResponseStatusException
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                twoFactorAuthService.verifyLogin(sessionToken, "wrong3", "EMAIL", "1.1.1.1", "agent")
        );
        assertEquals(401, ex.getStatusCode().value());
        verify(codeRepository, atLeastOnce()).invalidateSession(sessionToken);

        // Subsequent attempt blocked before DB lookup
        assertThrows(ResponseStatusException.class, () ->
                twoFactorAuthService.verifyLogin(sessionToken, "anycode", "EMAIL", "1.1.1.1", "agent")
        );
    }

    // ==========================================
    // RBAC & Permission Matrix Tests
    // ==========================================

    @Test
    @DisplayName("VOLUNTEER user has no access to finance:expense:read, but has general:read")
    void testVolunteerDeniedFinanceAccess() {
        UUID volunteerId = UUID.randomUUID();
        AdminUser volunteer = new AdminUser("Volunteer", "vol@example.org", "pass", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        volunteer.setId(volunteerId);
        volunteer.setTokenVersion(0);

        when(userRepository.findById(volunteerId)).thenReturn(Optional.of(volunteer));

        boolean hasAccess = securityEvaluator.hasPermission(volunteerId, "finance:expense:read", ScopeType.GLOBAL, null);
        assertFalse(hasAccess, "VOLUNTEER must not have finance:expense:read permission");

        boolean hasGeneralAccess = securityEvaluator.hasPermission(volunteerId, "general:read", ScopeType.GLOBAL, null);
        assertTrue(hasGeneralAccess, "VOLUNTEER must have general:read permission");
    }

    // ==========================================
    // Server-Side Token Revocation & Versioning Tests
    // ==========================================

    @Test
    @DisplayName("JWT includes token version and SecurityAspect rejects outdated tokens")
    void testTokenRevocationInSecurityAspect() {
        UUID userId = UUID.randomUUID();
        AdminUser user = new AdminUser("Admin", "admin@example.org", "pass", AdminStatus.APPROVED, AdminRole.ADMIN);
        user.setId(userId);
        user.setTokenVersion(2); // Current user token version is 2 in DB

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Token generated with version 1 (older than DB version 2)
        String outdatedToken = jwtService.generateToken(userId, user.getEmail(), "ADMIN", List.of("ADMIN"), 1);
        assertEquals(1, jwtService.extractTokenVersion(outdatedToken));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + outdatedToken);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission requirePermission = mock(RequirePermission.class);
        when(requirePermission.code()).thenReturn("admin:read");
        when(requirePermission.scopeType()).thenReturn(ScopeType.GLOBAL);
        when(requirePermission.scopeIdParam()).thenReturn("");

        // Aspect rejects with 401 Token revocat
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                securityAspect.checkPermission(joinPoint, requirePermission)
        );
        assertEquals(401, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Token revocat"));

        // Token generated with current version 2 is accepted
        String validToken = jwtService.generateToken(userId, user.getEmail(), "ADMIN", List.of("ADMIN"), 2);

        MockHttpServletRequest validRequest = new MockHttpServletRequest();
        validRequest.addHeader("Authorization", "Bearer " + validToken);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(validRequest));

        assertDoesNotThrow(() -> securityAspect.checkPermission(joinPoint, requirePermission));
    }

    @Test
    @DisplayName("Logout, Suspend, Role Change increment token_version")
    void testTokenVersionIncrementOnSecurityEvents() {
        UUID targetUserId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();

        AdminUser targetUser = new AdminUser("Target", "target@example.org", "pass", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        targetUser.setId(targetUserId);

        AdminUser adminActor = new AdminUser("Admin", "admin@example.org", "pass", AdminStatus.APPROVED, AdminRole.ADMIN);
        adminActor.setId(actorId);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
        when(userRepository.findById(actorId)).thenReturn(Optional.of(adminActor));

        // 1. Logout
        authService.logout(targetUserId);
        verify(userRepository, times(1)).incrementTokenVersion(targetUserId);

        // 2. Suspend
        authService.suspendUser(targetUserId, actorId, "1.1.1.1", "agent");
        verify(userRepository, times(2)).incrementTokenVersion(targetUserId);

        // 3. Role Update
        authService.updateUserRoles(targetUserId, List.of("FINANCE_ADMIN"), actorId, "1.1.1.1", "agent");
        verify(userRepository, times(3)).incrementTokenVersion(targetUserId);
    }

    // ==========================================
    // Production JWT Secret & Key Rotation Tests
    // ==========================================

    @Test
    @DisplayName("Default JWT secret with prod active profile throws IllegalStateException on validateSecret")
    void testDefaultJwtSecretFailsInProdProfile() {
        String defaultSecret = "charity_app_default_secure_jwt_signing_key_at_least_256_bits_long";
        JwtService prodJwtService = new JwtService(defaultSecret, 8);

        ReflectionTestUtils.setField(prodJwtService, "activeProfile", "prod");

        IllegalStateException ex = assertThrows(IllegalStateException.class, prodJwtService::validateSecret);
        assertTrue(ex.getMessage().contains("FATAL: Default JWT secret detected in non-dev environment"));
    }

    @Test
    @DisplayName("Token signed with previous key validates successfully when previous-secret is set")
    void testPreviousKeyValidatesDuringRotation() {
        JwtService oldKeyService = new JwtService(PREVIOUS_SECRET, 8);
        UUID userId = UUID.randomUUID();
        String oldToken = oldKeyService.generateToken(userId, "user@example.org", "VOLUNTEER");

        JwtService dualKeyService = new JwtService(TEST_SECRET, 8);
        ReflectionTestUtils.setField(dualKeyService, "previousRawSecret", PREVIOUS_SECRET);
        dualKeyService.validateSecret();

        Claims claims = dualKeyService.parseAndValidateClaims(oldToken);
        assertNotNull(claims);
        assertEquals(userId.toString(), claims.getSubject());
        assertEquals("user@example.org", claims.get("email"));
    }
}
