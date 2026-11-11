package com.charityapp.service.general;

import com.charityapp.service.general.ConfigEncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class ConfigEncryptionServiceTest {

    private ConfigEncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        // Use a test master key
        encryptionService = new ConfigEncryptionService("test_master_config_key_2026_at_least_32_bytes_long", "fallback_secret");
    }

    @Test
    void testEncryptAndDecrypt() {
        String secret = "sk_live_1234567890abcdef";
        String encrypted = encryptionService.encrypt(secret);

        assertNotNull(encrypted);
        assertTrue(encrypted.startsWith("enc:v1:"));
        assertNotEquals(secret, encrypted);

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(secret, decrypted);
    }

    @Test
    void testNullOrBlankHandling() {
        assertNull(encryptionService.encrypt(null));
        assertNull(encryptionService.encrypt("   "));
        assertNull(encryptionService.decrypt(null));
        assertNull(encryptionService.decrypt("   "));
    }

    @Test
    void testLegacyPlaintextPassThrough() {
        String plain = "regular_unencrypted_value";
        assertEquals(plain, encryptionService.decrypt(plain));
    }

    @Test
    void testMaskSecret() {
        assertEquals("••••••••••••••••••••", encryptionService.maskSecret("my_secret_token"));
        assertEquals("", encryptionService.maskSecret(null));
        assertEquals("", encryptionService.maskSecret(""));
    }

    @Test
    void testFingerprintComputation() {
        String fp1 = encryptionService.computeFingerprint("test-val-1");
        String fp2 = encryptionService.computeFingerprint("test-val-1");
        String fp3 = encryptionService.computeFingerprint("test-val-2");

        assertEquals(fp1, fp2);
        assertNotEquals(fp1, fp3);
    }

    @Test
    void testFallbackMasterKeyDerivation() {
        ConfigEncryptionService fallbackService = new ConfigEncryptionService(null, "my_jwt_secret");
        String text = "secure_database_password";
        String cipher = fallbackService.encrypt(text);
        assertNotNull(cipher);
        assertEquals(text, fallbackService.decrypt(cipher));
    }
}
