package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.security.PasswordHasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordHasherTest {

    private PasswordHasher passwordHasher;

    @BeforeEach
    void setUp() {
        passwordHasher = new PasswordHasher();
    }

    @Test
    @DisplayName("Modern 600k hashes format, verification and legacy 10k backward compatibility")
    void testPasswordHasherModernAndLegacy() {
        String password = "StrongSecretPassword2026!";

        // 1. New hash uses modern 600k format
        String modernHash = passwordHasher.hash(password);
        assertTrue(modernHash.startsWith("600000:"));
        assertTrue(passwordHasher.verify(password, modernHash));
        assertFalse(passwordHasher.verify("WrongPassword", modernHash));
        assertFalse(passwordHasher.needsRehash(modernHash));
        assertNull(passwordHasher.rehashIfNeeded(password, modernHash));

        // 2. Legacy 10k hash format: salt:hash (2 parts)
        String legacyHash = passwordHasher.hash(password, 10_000);
        // Transform to 2-part legacy format
        String[] parts = legacyHash.split(":");
        String legacy2Part = parts[1] + ":" + parts[2];

        // Legacy hash can still be verified
        assertTrue(passwordHasher.verify(password, legacy2Part));
        // System identifies that it needs rehash
        assertTrue(passwordHasher.needsRehash(legacy2Part));

        // Rehash produces modern 600k hash
        String upgradedHash = passwordHasher.rehashIfNeeded(password, legacy2Part);
        assertNotNull(upgradedHash);
        assertTrue(upgradedHash.startsWith("600000:"));
        assertTrue(passwordHasher.verify(password, upgradedHash));
    }
}
