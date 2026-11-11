package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.RefreshToken;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.auth.RefreshTokenRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class RefreshTokenService {

    public static final int REFRESH_TOKEN_VALIDITY_DAYS = 7;
    private final SecureRandom random = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final AdminUserRepository userRepository;
    private final AdminAuthService authService;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               AdminUserRepository userRepository,
                               @Lazy AdminAuthService authService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    public String generateRefreshToken(UUID userId, String ip, String ua) {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String tokenHash = sha256(rawToken);

        RefreshToken refreshToken = new RefreshToken(
            UUID.randomUUID(),
            userId,
            tokenHash,
            LocalDateTime.now().plusDays(REFRESH_TOKEN_VALIDITY_DAYS),
            ip,
            ua
        );
        refreshTokenRepository.save(refreshToken);
        return rawToken;
    }

    @Transactional
    public RefreshResult rotateToken(String rawToken, String ip, String ua) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token lipsă.");
        }

        String tokenHash = sha256(rawToken.trim());
        RefreshToken existingToken = refreshTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid."));

        UUID userId = existingToken.getUserId();
        AdminUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilizator necunoscut."));

        // Reuse detection: If token was already revoked, someone is attempting replay attack!
        if (existingToken.isRevoked()) {
            refreshTokenRepository.revokeAllByUserId(userId);
            userRepository.incrementTokenVersion(userId);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Posibilă compromitere a sesiunii. Toate token-urile au fost revocate.");
        }

        if (existingToken.isExpired()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirat. Vă rugăm să vă reconectați.");
        }

        if (user.getStatus() != AdminStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contul nu este activ.");
        }

        // Generate new refresh token
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String newRawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String newTokenHash = sha256(newRawToken);

        UUID newId = UUID.randomUUID();
        RefreshToken newRefreshToken = new RefreshToken(
            newId,
            userId,
            newTokenHash,
            LocalDateTime.now().plusDays(REFRESH_TOKEN_VALIDITY_DAYS),
            ip,
            ua
        );
        refreshTokenRepository.save(newRefreshToken);

        // Revoke old token and link to new one
        refreshTokenRepository.revokeToken(existingToken.getId(), newId);

        // Generate new session/JWT
        LoginResponseDTO sessionResponse = authService.generateSessionResponse(user, ip, ua);

        return new RefreshResult(sessionResponse.getToken(), newRawToken, sessionResponse.getExpiresAt(), sessionResponse);
    }

    public void revokeAllForUser(UUID userId) {
        if (userId != null) {
            refreshTokenRepository.revokeAllByUserId(userId);
        }
    }

    @Scheduled(fixedRate = 3600000)
    public void cleanupExpired() {
        refreshTokenRepository.cleanupExpired();
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Eroare la calcularea hash-ului SHA-256", e);
        }
    }

    public record RefreshResult(String accessToken, String refreshToken, String expiresAt, LoginResponseDTO loginResponse) {}
}
