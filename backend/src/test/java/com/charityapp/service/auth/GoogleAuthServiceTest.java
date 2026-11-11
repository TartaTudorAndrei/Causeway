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
import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.service.auth.AdminAuthService;
import com.charityapp.service.auth.GoogleAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class GoogleAuthServiceTest {

    private GoogleIdTokenVerifier verifier;
    private AdminUserRepository userRepository;
    private AdminAuthService authService;
    private GoogleAuthService googleAuthService;

    @BeforeEach
    void setUp() {
        verifier = mock(GoogleIdTokenVerifier.class);
        userRepository = mock(AdminUserRepository.class);
        authService = mock(AdminAuthService.class);
        googleAuthService = new GoogleAuthService(verifier, null, userRepository, authService);
    }

    private GoogleIdToken createMockToken(String email, boolean emailVerified, String name, String domain) {
        GoogleIdToken idToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail(email);
        payload.setEmailVerified(emailVerified);
        if (name != null) {
            payload.set("name", name);
        }
        if (domain != null) {
            payload.setHostedDomain(domain);
        }
        when(idToken.getPayload()).thenReturn(payload);
        return idToken;
    }

    @Test
    void testGoogleAuthUnregisteredUserRequiresRegistration() throws Exception {
        String tokenStr = "valid-google-token";
        GoogleIdToken token = createMockToken("volunteer@gmail.com", true, "Google Profile Name", null);
        when(verifier.verify(tokenStr)).thenReturn(token);
        when(userRepository.findByEmail("volunteer@gmail.com")).thenReturn(Optional.empty());

        AdminAuthService.StatusBlockedException ex = assertThrows(
                AdminAuthService.StatusBlockedException.class,
                () -> googleAuthService.authenticateGoogleUser(tokenStr, "127.0.0.1", "JUnit")
        );

        assertEquals("NEEDS_REGISTRATION", ex.getStatus());
        assertEquals("volunteer@gmail.com", ex.getEmail());
        verify(userRepository, never()).save(any());
    }

    @Test
    void testRegisterGoogleUserExplicitProfileEntry() throws Exception {
        String tokenStr = "valid-google-token";
        GoogleIdToken token = createMockToken("volunteer@gmail.com", true, "Google Profile Name", null);
        when(verifier.verify(tokenStr)).thenReturn(token);
        when(userRepository.findByEmail("volunteer@gmail.com")).thenReturn(Optional.empty());

        UUID generatedId = UUID.randomUUID();
        when(userRepository.save(any(AdminUser.class))).thenAnswer(invocation -> {
            AdminUser u = invocation.getArgument(0);
            u.setId(generatedId);
            return u;
        });

        com.charityapp.dto.auth.GoogleRegisterRequestDTO dto = new com.charityapp.dto.auth.GoogleRegisterRequestDTO(
                tokenStr, "Custom Full Name", "+40712345678", "Interact", "Interact Community", "Desire to help"
        );

        AdminUser registered = googleAuthService.registerGoogleUser(dto, "127.0.0.1", "JUnit");
        assertNotNull(registered);
        assertEquals("volunteer@gmail.com", registered.getEmail());
        assertEquals("Custom Full Name", registered.getFullName()); // NOT "Google Profile Name"
        assertEquals("+40712345678", registered.getPhone());
        assertEquals("Interact", registered.getOrganizationType());
        assertEquals("Interact Community", registered.getOrganizationDetails());
        assertEquals(AdminStatus.PENDING_APPROVAL, registered.getStatus());
        assertEquals("VOLUNTEER", registered.getRole());
        assertNull(registered.getPasswordHash());
        assertEquals(com.charityapp.model.auth.AuthProvider.GOOGLE, registered.getAuthProvider());
        verify(authService).sendVolunteerWelcomeNotification(registered);
    }

    @Test
    void testGoogleAuthExistingApprovedUserGeneratesSession() throws Exception {
        String tokenStr = "valid-google-token";
        GoogleIdToken token = createMockToken("admin@example.org", true, "Admin User", null);
        when(verifier.verify(tokenStr)).thenReturn(token);

        AdminUser approvedUser = new AdminUser("Admin User", "admin@example.org", "GOOGLE_OAUTH_USER", AdminStatus.APPROVED, AdminRole.ADMIN);
        UUID userId = UUID.randomUUID();
        approvedUser.setId(userId);
        when(userRepository.findByEmail("admin@example.org")).thenReturn(Optional.of(approvedUser));

        LoginResponseDTO mockSession = new LoginResponseDTO(
                "jwt.mock.token",
                "2026-08-27T23:59:59",
                new LoginResponseDTO.UserDetailsDTO("Admin User", "admin@example.org", "ADMIN", java.util.List.of("ADMIN"), "", "", "")
        );
        when(authService.generateSessionResponse(eq(approvedUser), eq("127.0.0.1"), eq("JUnit"))).thenReturn(mockSession);

        LoginResponseDTO result = googleAuthService.authenticateGoogleUser(tokenStr, "127.0.0.1", "JUnit");
        assertNotNull(result);
        assertEquals("jwt.mock.token", result.getToken());
        verify(authService).generateSessionResponse(approvedUser, "127.0.0.1", "JUnit");
    }

    @Test
    void testGoogleAuthExistingPendingUserBlocked() throws Exception {
        String tokenStr = "valid-google-token";
        GoogleIdToken token = createMockToken("pending@example.com", true, "Pending User", null);
        when(verifier.verify(tokenStr)).thenReturn(token);

        AdminUser pendingUser = new AdminUser("Pending User", "pending@example.com", "GOOGLE_OAUTH_USER", AdminStatus.PENDING_APPROVAL, AdminRole.VOLUNTEER);
        when(userRepository.findByEmail("pending@example.com")).thenReturn(Optional.of(pendingUser));

        AdminAuthService.StatusBlockedException ex = assertThrows(
                AdminAuthService.StatusBlockedException.class,
                () -> googleAuthService.authenticateGoogleUser(tokenStr, "127.0.0.1", "JUnit")
        );
        assertEquals("PENDING_APPROVAL", ex.getStatus());
    }

    @Test
    void testGoogleAuthUnverifiedEmailFails() throws Exception {
        String tokenStr = "unverified-token";
        GoogleIdToken token = createMockToken("unverified@example.com", false, "Unverified User", null);
        when(verifier.verify(tokenStr)).thenReturn(token);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> googleAuthService.authenticateGoogleUser(tokenStr, "127.0.0.1", "JUnit")
        );
        assertTrue(ex.getMessage().contains("nu este verificată"));
    }

    @Test
    void testGoogleAuthHostedDomainRestriction() throws Exception {
        GoogleAuthService domainRestrictedService = new GoogleAuthService(verifier, "example.org", userRepository, authService);

        String tokenStr = "token-other-domain";
        GoogleIdToken token = createMockToken("user@gmail.com", true, "Other Domain User", "gmail.com");
        when(verifier.verify(tokenStr)).thenReturn(token);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> domainRestrictedService.authenticateGoogleUser(tokenStr, "127.0.0.1", "JUnit")
        );
        assertTrue(ex.getMessage().contains("example.org"));
    }

    @Test
    void testGoogleAuthInvalidTokenFails() throws Exception {
        when(verifier.verify("bad-token")).thenReturn(null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> googleAuthService.authenticateGoogleUser("bad-token", "127.0.0.1", "JUnit")
        );
        assertTrue(ex.getMessage().contains("invalid sau expirat"));
    }
}
