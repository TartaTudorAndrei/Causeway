package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.repository.auth.ActiveSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class SessionManagerService {

    public static final int MAX_CONCURRENT_DEVICES = 10;
    public static final int MAX_CONCURRENT_SESSIONS = MAX_CONCURRENT_DEVICES;

    private final ActiveSessionRepository sessionRepository;

    public SessionManagerService(ActiveSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    /**
     * Register a new device session.
     * Replaces previous session for the same device (User-Agent).
     * If user exceeds MAX_CONCURRENT_DEVICES distinct devices, evict oldest device (FIFO).
     */
    @Transactional
    public void registerSession(UUID userId, String tokenHash, String ip, String ua, Instant expiresAt) {
        if (userId == null || tokenHash == null) return;

        // 1. Delete expired sessions for this user
        sessionRepository.deleteExpired(userId);

        // 2. Replace prior active session on the exact same device/User-Agent
        if (ua != null && !ua.isBlank()) {
            sessionRepository.deleteByUserIdAndUserAgent(userId, ua);
        }

        // 3. Count remaining active device sessions
        int activeCount = sessionRepository.countByUserId(userId);

        // 4. If at limit of distinct devices, evict oldest
        while (activeCount >= MAX_CONCURRENT_DEVICES) {
            sessionRepository.deleteOldest(userId);
            activeCount--;
        }

        // 5. Insert new session for this device
        sessionRepository.save(userId, tokenHash, ip, ua, expiresAt);
    }

    /**
     * Validate session exists and is not expired. Updates last_seen_at.
     */
    public boolean isSessionValid(String tokenHash) {
        return sessionRepository.validateAndTouch(tokenHash);
    }

    /**
     * Remove specific session on logout.
     */
    public void revokeSession(String tokenHash) {
        sessionRepository.deleteByTokenHash(tokenHash);
    }

    /**
     * Remove all sessions for user (force logout everywhere).
     * Call on: admin suspension, password reset, token_version bump.
     */
    public void revokeAllSessions(UUID userId) {
        sessionRepository.deleteAllByUserId(userId);
    }

    /**
     * Cleanup expired sessions globally. Run every 10 minutes.
     */
    @Scheduled(fixedRate = 600_000)
    public void cleanupExpired() {
        sessionRepository.deleteAllExpired();
    }
}
