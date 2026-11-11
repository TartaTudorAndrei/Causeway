package com.charityapp.util;

import com.charityapp.util.TotpUtil;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TotpUtilTest {

    @Test
    void testSecretGeneration() {
        String secret = TotpUtil.generateSecret();
        assertNotNull(secret);
        assertTrue(secret.length() >= 32);
        assertTrue(secret.matches("[A-Z2-7]+"));
    }

    @Test
    void testTotpGenerationAndVerification() {
        String secret = TotpUtil.generateSecret();
        long now = System.currentTimeMillis() / 1000L;
        String code = TotpUtil.generateCode(secret, now);
        assertNotNull(code);
        assertEquals(6, code.length());
        assertTrue(code.matches("\\d{6}"));

        // Verify with current time
        assertTrue(TotpUtil.verifyCode(secret, code, now));

        // Verify with clock skew +/- 30 seconds
        assertTrue(TotpUtil.verifyCode(secret, code, now + 25));
        assertTrue(TotpUtil.verifyCode(secret, code, now - 25));

        // Invalid code check
        assertFalse(TotpUtil.verifyCode(secret, "000000", now));
        assertFalse(TotpUtil.verifyCode(secret, "invalid", now));
    }

    @Test
    void testOtpAuthUrl() {
        String secret = "JBSWY3DPEHPK3PXP";
        String url = TotpUtil.getOtpAuthUrl("admin@example.org", secret, "Causeway");
        assertNotNull(url);
        assertTrue(url.startsWith("otpauth://totp/"));
        assertTrue(url.contains("secret=" + secret));
        assertTrue(url.contains("digits=6"));
    }
}
