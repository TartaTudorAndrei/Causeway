package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.security.PasswordPolicyValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyValidatorTest {

    private PasswordPolicyValidator passwordPolicyValidator;

    @BeforeEach
    void setUp() {
        passwordPolicyValidator = new PasswordPolicyValidator();
    }

    @Test
    @DisplayName("Weak passwords fail validation with specific violations")
    void testWeakPasswordsFail() {
        assertThrows(IllegalArgumentException.class, () -> passwordPolicyValidator.validate("short"));
        assertThrows(IllegalArgumentException.class, () -> passwordPolicyValidator.validate("alllowercase123!"));
        assertThrows(IllegalArgumentException.class, () -> passwordPolicyValidator.validate("ALLUPPERCASE123!"));
        assertThrows(IllegalArgumentException.class, () -> passwordPolicyValidator.validate("NoSpecialChars123"));
        assertThrows(IllegalArgumentException.class, () -> passwordPolicyValidator.validate("NoDigitsHere!@#$"));
    }

    @Test
    @DisplayName("Compliant password passes validation")
    void testCompliantPasswordPasses() {
        assertDoesNotThrow(() -> passwordPolicyValidator.validate("Str0ngP@ssword123!"));
    }
}
