package com.charityapp.webhook;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.service.notification.WhatsAppNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppWebhookControllerTest {

    @Mock
    private WhatsAppNotificationService whatsAppNotificationService;

    private AppConfigProperties appConfigProperties;
    private WhatsAppWebhookController controller;

    @BeforeEach
    void setUp() {
        appConfigProperties = new AppConfigProperties();
        appConfigProperties.getWhatsapp().setInternalSecret("test_secret");
        controller = new WhatsAppWebhookController(whatsAppNotificationService, appConfigProperties);
    }

    @Test
    void testRejectsUnauthorizedRequest() {
        ResponseEntity<Map<String, Object>> response = controller.handleWhatsAppEvent("wrong_secret", Map.of("eventType", "GROUP_JOIN"));
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verifyNoInteractions(whatsAppNotificationService);
    }

    @Test
    void testProcessesGroupParticipantJoinedEvent() {
        Map<String, Object> payload = Map.of(
                "eventType", "GROUP_PARTICIPANTS_UPDATE",
                "action", "add",
                "groupJid", "group123@g.us",
                "groupSubject", "Echipa Voluntari",
                "participantJid", "40712345678@s.whatsapp.net"
        );

        ResponseEntity<Map<String, Object>> response = controller.handleWhatsAppEvent("test_secret", payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        verify(whatsAppNotificationService).handleGroupParticipantJoined("group123@g.us", "Echipa Voluntari", "40712345678@s.whatsapp.net");
    }
}
