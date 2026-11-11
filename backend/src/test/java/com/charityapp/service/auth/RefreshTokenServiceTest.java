package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.RefreshToken;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.auth.RefreshTokenRepository;
import com.charityapp.service.auth.AdminAuthService;
import com.charityapp.service.auth.RefreshTokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {

    @Test
    @DisplayName("Using an already-revoked refresh token triggers reuse detection and revokes all tokens")
    void testRefreshTokenReuseTriggersFullRevocation() {
        RefreshTokenRepository refreshRepo = mock(RefreshTokenRepository.class);
        AdminUserRepository userRepo = mock(AdminUserRepository.class);
        AdminAuthService authService = mock(AdminAuthService.class);

        RefreshTokenService refreshService = new RefreshTokenService(refreshRepo, userRepo, authService);

        UUID userId = UUID.randomUUID();
        AdminUser user = new AdminUser("User", "user@example.org", "pass", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        RefreshToken revokedToken = new RefreshToken(UUID.randomUUID(), userId, "hash1", LocalDateTime.now().plusDays(5), "127.0.0.1", "agent");
        revokedToken.setRevokedAt(LocalDateTime.now().minusHours(1)); // Marked as revoked

        when(refreshRepo.findByTokenHash(any())).thenReturn(Optional.of(revokedToken));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                refreshService.rotateToken("any_raw_token", "127.0.0.1", "agent")
        );

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        assertTrue(ex.getReason().contains("compromitere"));

        // All user refresh tokens must be revoked and token_version incremented
        verify(refreshRepo, times(1)).revokeAllByUserId(userId);
        verify(userRepo, times(1)).incrementTokenVersion(userId);
    }
}
