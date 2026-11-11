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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/whatsapp")
public class WhatsAppWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);

    private final WhatsAppNotificationService whatsAppNotificationService;
    private final AppConfigProperties appConfigProperties;

    public WhatsAppWebhookController(WhatsAppNotificationService whatsAppNotificationService,
                                     AppConfigProperties appConfigProperties) {
        this.whatsAppNotificationService = whatsAppNotificationService;
        this.appConfigProperties = appConfigProperties;
    }

    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> handleWhatsAppEvent(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, Object> payload) {

        String expectedSecret = appConfigProperties != null && appConfigProperties.getWhatsapp() != null
                ? appConfigProperties.getWhatsapp().getInternalSecret()
                : "app_internal_secret";

        if (token == null || !token.equals(expectedSecret)) {
            log.warn("Unauthorized WhatsApp webhook attempt with invalid token");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized"));
        }

        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing payload"));
        }

        String eventType = (String) payload.get("eventType");
        log.info("WhatsApp event received: {}", eventType);

        if ("GROUP_PARTICIPANTS_UPDATE".equalsIgnoreCase(eventType) || "GROUP_JOIN".equalsIgnoreCase(eventType)) {
            String action = (String) payload.get("action");
            if ("add".equalsIgnoreCase(action)) {
                String groupJid = (String) payload.get("groupJid");
                String groupSubject = (String) payload.get("groupSubject");
                String participantJid = (String) payload.get("participantJid");

                log.info("Processing WhatsApp group join event: participant {} in group {}", participantJid, groupJid);
                whatsAppNotificationService.handleGroupParticipantJoined(groupJid, groupSubject, participantJid);
            }
        }

        return ResponseEntity.ok(Map.of("success", true, "status", "processed"));
    }
}
