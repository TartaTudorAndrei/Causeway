package com.charityapp.service.general;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class ConfigEncryptionService {

    private static final Logger log = LoggerFactory.getLogger(ConfigEncryptionService.class);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int IV_LENGTH_BYTES = 12;
    private static final String PREFIX = "enc:v1:";

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public ConfigEncryptionService(
            @Value("${app.config.master-key:${MASTER_CONFIG_KEY:}}") String masterConfigKey,
            @Value("${app.jwt.secret:charity_app_super_secret_jwt_signing_key_2026_at_least_32_bytes_long}") String fallbackSecret) {
        
        byte[] keyBytes;
        if (masterConfigKey != null && !masterConfigKey.isBlank()) {
            keyBytes = sha256(masterConfigKey.trim());
        } else {
            log.warn("MASTER_CONFIG_KEY is not defined in environment. Using derived fallback key from application bootstrap secret.");
            keyBytes = sha256("system-config-salt-2026:" + fallbackSecret);
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            String ivEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(iv);
            String cipherEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(cipherText);

            return PREFIX + ivEncoded + ":" + cipherEncoded;
        } catch (Exception e) {
            log.error("Failed to encrypt configuration secret: {}", e.getMessage());
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            return null;
        }
        if (!encryptedValue.startsWith(PREFIX)) {
            // Not encrypted or legacy plaintext
            return encryptedValue;
        }

        try {
            String payload = encryptedValue.substring(PREFIX.length());
            int sepIndex = payload.indexOf(':');
            if (sepIndex == -1) {
                throw new IllegalArgumentException("Malformed ciphertext format");
            }

            String ivStr = payload.substring(0, sepIndex);
            String cipherStr = payload.substring(sepIndex + 1);

            byte[] iv = Base64.getUrlDecoder().decode(ivStr);
            byte[] cipherText = Base64.getUrlDecoder().decode(cipherStr);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to decrypt configuration secret: {}", e.getMessage());
            throw new RuntimeException("Decryption failed", e);
        }
    }

    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    public String maskSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        return "••••••••••••••••••••";
    }

    public String computeFingerprint(String value) {
        if (value == null || value.isBlank()) {
            return "empty";
        }
        byte[] hash = sha256(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hash).substring(0, 16);
    }

    private static byte[] sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
