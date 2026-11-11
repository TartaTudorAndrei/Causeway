package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.repository.auth.ActiveSessionRepository;
import com.charityapp.service.auth.SessionManagerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SessionManagerServiceTest {

    @Test
    @DisplayName("Registering new session for same device replaces old session for that device")
    void testSessionReplacesSameDevice() {
        ActiveSessionRepository sessionRepo = mock(ActiveSessionRepository.class);
        SessionManagerService sessionManager = new SessionManagerService(sessionRepo);

        UUID userId = UUID.randomUUID();
        when(sessionRepo.countByUserId(userId)).thenReturn(1);

        sessionManager.registerSession(userId, "token_hash_2", "127.0.0.1", "Mozilla/5.0 Safari", Instant.now().plusSeconds(3600));

        verify(sessionRepo, times(1)).deleteByUserIdAndUserAgent(userId, "Mozilla/5.0 Safari");
        verify(sessionRepo, times(1)).save(eq(userId), eq("token_hash_2"), any(), eq("Mozilla/5.0 Safari"), any());
    }

    @Test
    @DisplayName("Registering more than MAX_CONCURRENT_DEVICES evicts the oldest device session")
    void testSessionConcurrencyLimitEvictsOldest() {
        ActiveSessionRepository sessionRepo = mock(ActiveSessionRepository.class);
        SessionManagerService sessionManager = new SessionManagerService(sessionRepo);

        UUID userId = UUID.randomUUID();
        when(sessionRepo.countByUserId(userId)).thenReturn(SessionManagerService.MAX_CONCURRENT_DEVICES);

        sessionManager.registerSession(userId, "token_hash_new", "127.0.0.1", "Unique-Device-Agent", Instant.now().plusSeconds(3600));

        // Must delete oldest session when at limit
        verify(sessionRepo, times(1)).deleteOldest(userId);
        verify(sessionRepo, times(1)).save(eq(userId), eq("token_hash_new"), any(), any(), any());
    }
}
