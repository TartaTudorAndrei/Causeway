package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.auth.JwtService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private JwtService jwtService;
    private final String secret = "charity_test_secret_key_for_jwt_which_is_at_least_32_bytes_long";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(secret, 8);
    }

    @Test
    void testGenerateAndValidateToken() {
        UUID userId = UUID.randomUUID();
        String email = "admin@example.org";
        String role = "SUPER_ADMIN";

        String token = jwtService.generateToken(userId, email, role);
        assertNotNull(token);
        assertFalse(token.isBlank());

        assertTrue(jwtService.isTokenValid(token));
        assertEquals(userId, jwtService.extractUserId(token));
        assertEquals(email, jwtService.extractEmail(token));
        assertEquals(role, jwtService.extractRole(token));

        Claims claims = jwtService.parseAndValidateClaims(token);
        assertEquals(userId.toString(), claims.getSubject());
        assertEquals(email, claims.get("email"));
        assertEquals(role, claims.get("role"));
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
    }

    @Test
    void testTamperedTokenFailsValidation() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "admin@example.org", "ADMIN");

        // Tamper with token signature / payload
        String tamperedToken = token.substring(0, token.length() - 5) + "abcde";

        assertFalse(jwtService.isTokenValid(tamperedToken));
        assertNull(jwtService.extractUserId(tamperedToken));
        assertThrows(Exception.class, () -> jwtService.parseAndValidateClaims(tamperedToken));
    }

    @Test
    void testDifferentKeyRejectsToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "admin@example.org", "ADMIN");

        JwtService otherService = new JwtService("different_secret_key_that_is_also_at_least_32_bytes_long", 8);

        assertFalse(otherService.isTokenValid(token));
        assertNull(otherService.extractUserId(token));
    }

    @Test
    void testInvalidOrEmptyToken() {
        assertFalse(jwtService.isTokenValid(null));
        assertFalse(jwtService.isTokenValid(""));
        assertFalse(jwtService.isTokenValid("   "));
        assertFalse(jwtService.isTokenValid("jwt-mock-1234-invalid"));

        assertNull(jwtService.extractUserId(null));
        assertNull(jwtService.extractUserId("invalid"));
        assertNull(jwtService.extractEmail(null));
        assertNull(jwtService.extractRole(null));
        assertNull(jwtService.extractExpiration(null));
    }

    @Test
    void testExpiredTokenValidation() {
        // Create service with 0 or negative expiration hours
        JwtService expiredService = new JwtService(secret, -1);
        UUID userId = UUID.randomUUID();
        String token = expiredService.generateToken(userId, "expired@example.org", "VOLUNTEER");

        assertFalse(jwtService.isTokenValid(token));
        assertNull(jwtService.extractUserId(token));
    }
}
