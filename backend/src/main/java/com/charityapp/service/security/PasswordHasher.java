package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import org.springframework.stereotype.Component;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

@Component
public class PasswordHasher {
    public static final int DEFAULT_ITERATIONS = 600_000;
    public static final int LEGACY_ITERATIONS = 10_000;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_LENGTH = 16;

    public String hash(String password) {
        return hash(password, DEFAULT_ITERATIONS);
    }

    public String hash(String password, int iterations) {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[SALT_LENGTH];
        random.nextBytes(salt);

        byte[] hash = pbkdf2(password.toCharArray(), salt, iterations);
        return iterations + ":" + Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
    }

    public boolean verify(String password, String storedHash) {
        if (password == null || storedHash == null || storedHash.isBlank()) {
            return false;
        }

        String[] parts = storedHash.split(":");
        int iterations;
        byte[] salt;
        byte[] hash;

        if (parts.length == 2) {
            // Legacy 10,000 iterations format: salt:hash
            iterations = LEGACY_ITERATIONS;
            try {
                salt = Base64.getDecoder().decode(parts[0]);
                hash = Base64.getDecoder().decode(parts[1]);
            } catch (IllegalArgumentException e) {
                return false;
            }
        } else if (parts.length == 3) {
            // OWASP format: iterations:salt:hash
            try {
                iterations = Integer.parseInt(parts[0]);
                salt = Base64.getDecoder().decode(parts[1]);
                hash = Base64.getDecoder().decode(parts[2]);
            } catch (IllegalArgumentException e) {
                return false;
            }
        } else {
            return false;
        }

        byte[] testHash = pbkdf2(password.toCharArray(), salt, iterations);

        int diff = hash.length ^ testHash.length;
        for (int i = 0; i < hash.length && i < testHash.length; i++) {
            diff |= hash[i] ^ testHash[i];
        }
        return diff == 0;
    }

    public boolean needsRehash(String storedHash) {
        if (storedHash == null || storedHash.isBlank()) {
            return true;
        }
        String[] parts = storedHash.split(":");
        if (parts.length == 2) {
            return true; // Legacy hash
        }
        if (parts.length == 3) {
            try {
                int iterations = Integer.parseInt(parts[0]);
                return iterations < DEFAULT_ITERATIONS;
            } catch (NumberFormatException e) {
                return true;
            }
        }
        return true;
    }

    public String rehashIfNeeded(String password, String storedHash) {
        if (verify(password, storedHash) && needsRehash(storedHash)) {
            return hash(password, DEFAULT_ITERATIONS);
        }
        return null;
    }

    private byte[] pbkdf2(char[] password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, KEY_LENGTH);
        try {
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return skf.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("Eroare la criptarea parolei", e);
        } finally {
            spec.clearPassword();
        }
    }
}
