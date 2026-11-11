package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {
    private final SecretKey secretKey;
    private final long expirationHours;
    private final String rawSecret;
    private SecretKey previousSecretKey;

    @Value("${app.jwt.previous-secret:}")
    private String previousRawSecret;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    public JwtService(
            @Value("${app.jwt.secret:charity_app_default_secure_jwt_signing_key_at_least_256_bits_long}") String secret,
            @Value("${app.jwt.expiration-hours:8}") long expirationHours) {
        this.rawSecret = secret;
        this.secretKey = deriveSecretKey(secret);
        this.expirationHours = expirationHours;
    }

    @PostConstruct
    public void validateSecret() {
        if (previousRawSecret != null && !previousRawSecret.isBlank()) {
            this.previousSecretKey = deriveSecretKey(previousRawSecret);
        }

        List<String> defaults = List.of(
            "charity_app_default_secure_jwt_signing_key_at_least_256_bits_long",
            "charity_app_super_secret_jwt_signing_key_2026_at_least_32_bytes_long"
        );
        if (defaults.stream().anyMatch(d -> d.equals(rawSecret)) && !"dev".equalsIgnoreCase(activeProfile) && !"test".equalsIgnoreCase(activeProfile)) {
            throw new IllegalStateException(
                "FATAL: Default JWT secret detected in non-dev environment. Set JWT_SECRET env variable!"
            );
        }
    }

    private SecretKey deriveSecretKey(String secret) {
        try {
            byte[] keyBytes = (secret != null ? secret : "charity_app_default_secure_jwt_signing_key_at_least_256_bits_long").getBytes(StandardCharsets.UTF_8);
            if (keyBytes.length < 32) {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                keyBytes = md.digest(keyBytes);
            }
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive JWT secret key", e);
        }
    }

    public String generateToken(UUID userId, String email, String role) {
        return generateToken(userId, email, role, role != null ? java.util.List.of(role) : java.util.List.of("VOLUNTEER"), 0);
    }

    public String generateToken(UUID userId, String email, String role, java.util.List<String> roles) {
        return generateToken(userId, email, role, roles, 0);
    }

    public String generateToken(UUID userId, String email, String role, java.util.List<String> roles, int tokenVersion) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expirationHours, ChronoUnit.HOURS);
        java.util.List<String> rolesList = (roles != null && !roles.isEmpty()) ? roles : (role != null ? java.util.List.of(role) : java.util.List.of("VOLUNTEER"));

        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role != null ? role : rolesList.get(0))
                .claim("roles", rolesList)
                .claim("ver", tokenVersion)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(secretKey)
                .compact();
    }

    public Claims parseAndValidateClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token is empty or null");
        }
        String trimmed = token.trim();
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(trimmed)
                    .getPayload();
        } catch (JwtException e) {
            if (previousSecretKey != null) {
                try {
                    return Jwts.parser()
                            .verifyWith(previousSecretKey)
                            .build()
                            .parseSignedClaims(trimmed)
                            .getPayload();
                } catch (JwtException ignored) {}
            }
            throw e;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            parseAndValidateClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public UUID extractUserId(String token) {
        try {
            Claims claims = parseAndValidateClaims(token);
            String subject = claims.getSubject();
            if (subject != null && !subject.isBlank()) {
                return UUID.fromString(subject);
            }
        } catch (Exception ignored) {}
        return null;
    }

    public String extractEmail(String token) {
        try {
            Claims claims = parseAndValidateClaims(token);
            return claims.get("email", String.class);
        } catch (Exception ignored) {}
        return null;
    }

    public String extractRole(String token) {
        try {
            Claims claims = parseAndValidateClaims(token);
            return claims.get("role", String.class);
        } catch (Exception ignored) {}
        return null;
    }

    @SuppressWarnings("unchecked")
    public java.util.List<String> extractRoles(String token) {
        try {
            Claims claims = parseAndValidateClaims(token);
            Object rolesObj = claims.get("roles");
            if (rolesObj instanceof java.util.List<?>) {
                return (java.util.List<String>) rolesObj;
            }
            String singleRole = claims.get("role", String.class);
            if (singleRole != null && !singleRole.isBlank()) {
                return java.util.List.of(singleRole);
            }
        } catch (Exception ignored) {}
        return java.util.List.of("VOLUNTEER");
    }

    public Instant extractExpiration(String token) {
        try {
            Claims claims = parseAndValidateClaims(token);
            Date exp = claims.getExpiration();
            return exp != null ? exp.toInstant() : null;
        } catch (Exception ignored) {}
        return null;
    }

    public Integer extractTokenVersion(String token) {
        try {
            Claims claims = parseAndValidateClaims(token);
            Object ver = claims.get("ver");
            if (ver instanceof Number) {
                return ((Number) ver).intValue();
            }
        } catch (Exception ignored) {}
        return null;
    }

    public long getExpirationHours() {
        return expirationHours;
    }
}
