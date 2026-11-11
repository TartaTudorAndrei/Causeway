package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.security.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
    }

    @Test
    @DisplayName("5 failed logins triggers rate limit, resets on success")
    void testLoginRateLimiting() {
        String ip = "192.168.1.50";
        String email = "target@example.org";

        assertTrue(rateLimiterService.isLoginAllowed(ip, email));

        for (int i = 0; i < 4; i++) {
            rateLimiterService.recordLoginFailure(ip, email);
            assertTrue(rateLimiterService.isLoginAllowed(ip, email));
        }

        // 5th failure
        rateLimiterService.recordLoginFailure(ip, email);
        assertFalse(rateLimiterService.isLoginAllowed(ip, email));

        // Reset
        rateLimiterService.resetLogin(ip, email);
        assertTrue(rateLimiterService.isLoginAllowed(ip, email));
    }

    @Test
    @DisplayName("6 failed logins from same IP+email triggers rate limiting")
    void testSixFailedLoginsTriggerRateLimit() {
        String ip = "192.168.1.100";
        String email = "victim@example.org";

        // Initial state: allowed
        assertTrue(rateLimiterService.isLoginAllowed(ip, email));

        // 5 consecutive failures: 5th failure trips threshold
        for (int i = 0; i < 5; i++) {
            rateLimiterService.recordLoginFailure(ip, email);
        }

        // 6th attempt is blocked
        assertFalse(rateLimiterService.isLoginAllowed(ip, email), "Login must be blocked after 5 failed attempts within window");
    }

    @Test
    @DisplayName("Forgot password limits to 3 requests per window")
    void testForgotPasswordRateLimiting() {
        String email = "donor@example.org";
        assertTrue(rateLimiterService.isForgotPasswordAllowed(email));

        rateLimiterService.recordForgotPasswordAttempt(email);
        rateLimiterService.recordForgotPasswordAttempt(email);
        assertTrue(rateLimiterService.isForgotPasswordAllowed(email));

        rateLimiterService.recordForgotPasswordAttempt(email);
        assertFalse(rateLimiterService.isForgotPasswordAllowed(email));
    }

    @Test
    @DisplayName("Public stand signup limits to 10 requests per window")
    void testPublicStandSignupRateLimiting() {
        String ip = "10.0.0.1";
        assertTrue(rateLimiterService.isPublicStandSignupAllowed(ip));

        for (int i = 0; i < 9; i++) {
            rateLimiterService.recordPublicStandSignupAttempt(ip);
            assertTrue(rateLimiterService.isPublicStandSignupAllowed(ip));
        }

        rateLimiterService.recordPublicStandSignupAttempt(ip);
        assertFalse(rateLimiterService.isPublicStandSignupAllowed(ip));
    }
}
