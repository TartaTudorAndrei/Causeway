package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.security.EmailExistenceValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmailExistenceValidatorTest {

    private EmailExistenceValidator validator;

    @BeforeEach
    void setUp() {
        validator = new EmailExistenceValidator();
    }

    @Test
    void testValidEmailFormats() {
        // Known valid domain that has MX records
        assertDoesNotThrow(() -> validator.validateEmail("contact@google.com"));
        assertDoesNotThrow(() -> validator.validateEmail("admin.test@gmail.com"));
    }

    @Test
    void testBlankOrNullEmailThrows() {
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail(null));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail(""));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("   "));
    }

    @Test
    void testInvalidFormatThrows() {
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("invalid-email"));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("user@"));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("@domain.com"));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("user@domain"));
    }

    @Test
    void testDisposableDomainThrows() {
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("test@mailinator.com"));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("user@tempmail.com"));
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("fake@10minutemail.com"));
    }

    @Test
    void testNonExistentDomainThrows() {
        assertThrows(IllegalArgumentException.class, () -> validator.validateEmail("user@thisdomaindefinitelydoesnotexist999888777111.xyz"));
    }
}
