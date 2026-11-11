package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ResendEmailServiceTest {

    private ResendEmailService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new ResendEmailService(objectMapper);
    }

    @Test
    void testIsConfiguredReturnsFalseWhenBlankOrPlaceholder() {
        service.setApiKey("");
        assertFalse(service.isConfigured());

        service.setApiKey(null);
        assertFalse(service.isConfigured());

        service.setApiKey("   ");
        assertFalse(service.isConfigured());

        service.setApiKey("re_placeholder");
        assertFalse(service.isConfigured());
    }

    @Test
    void testIsConfiguredReturnsTrueWhenValidKey() {
        service.setApiKey("re_live_1234567890abcdef");
        assertTrue(service.isConfigured());
    }

    @Test
    void testSendEmailReturnsFalseWhenNotConfigured() {
        service.setApiKey("");
        boolean sent = service.sendEmail("recipient@test.org", "Subject", "<p>Body</p>");
        assertFalse(sent);
    }

    @Test
    void testDefaultSenderIsConfigured() {
        assertEquals("contact@example.org", service.getFromEmail());
        assertEquals("Causeway", service.getFromName());
    }
}
