package com.charityapp.controller.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.notification.NotificationRuleDTO;
import com.charityapp.dto.notification.PwaSendTestDTO;
import com.charityapp.dto.notification.TriggerMetadataDTO;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.notification.PwaNotificationService;
import com.charityapp.service.general.NotificationRuleService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/pwa")
public class PwaAdminController {

    private final PwaNotificationService pwaNotificationService;
    private final NotificationRuleService notificationRuleService;
    private final JwtService jwtService;
    private final AdminUserRepository adminUserRepository;

    public PwaAdminController(PwaNotificationService pwaNotificationService,
                              NotificationRuleService notificationRuleService,
                              JwtService jwtService,
                              AdminUserRepository adminUserRepository) {
        this.pwaNotificationService = pwaNotificationService;
        this.notificationRuleService = notificationRuleService;
        this.jwtService = jwtService;
        this.adminUserRepository = adminUserRepository;
    }

    @GetMapping("/status")
    @RequirePermission(code = "it:pwa:read", anyOf = {"it:read", "admin:read", "it:pwa:view"})
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(pwaNotificationService.getStatus());
    }

    /** Lightweight user list for the send-test recipient dropdown — returns only id, fullName, email. */
    @GetMapping("/users")
    @RequirePermission(code = "it:pwa:read", anyOf = {"it:read", "admin:read", "it:pwa:view"})
    public ResponseEntity<List<Map<String, Object>>> getPwaUsers() {
        List<AdminUser> all = adminUserRepository.findAll();
        List<Map<String, Object>> result = all.stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId().toString(),
                        "fullName", u.getFullName() != null ? u.getFullName() : "",
                        "email", u.getEmail() != null ? u.getEmail() : ""
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/roles")
    @RequirePermission(code = "it:pwa:read", anyOf = {"it:read", "admin:read", "it:pwa:view"})
    public ResponseEntity<List<Map<String, String>>> getPwaRoles() {
        return ResponseEntity.ok(pwaNotificationService.getAvailableRoles());
    }

    @GetMapping("/active-stands")
    @RequirePermission(code = "it:pwa:read", anyOf = {"it:read", "admin:read", "it:pwa:view"})
    public ResponseEntity<List<Map<String, Object>>> getPwaActiveStands() {
        return ResponseEntity.ok(pwaNotificationService.getIncompleteStands());
    }

    @GetMapping("/triggers")
    @RequirePermission(code = "it:pwa:read", anyOf = {"it:read", "admin:read", "it:pwa:view"})
    public ResponseEntity<List<TriggerMetadataDTO>> getTriggerCatalog() {
        return ResponseEntity.ok(pwaNotificationService.getTriggerCatalog());
    }

    @GetMapping("/rules")
    @RequirePermission(code = "it:pwa:read", anyOf = {"it:read", "admin:read", "it:pwa:view"})
    public ResponseEntity<List<NotificationRuleDTO>> getRules(
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(notificationRuleService.getAllRules("PWA", category));
    }

    @PostMapping("/rules")
    @RequirePermission(code = "it:pwa:write", anyOf = {"it:pwa:manage", "it:write", "admin:write"})
    public ResponseEntity<NotificationRuleDTO> createRule(@RequestBody NotificationRuleDTO dto) {
        if (dto != null) {
            dto.setChannel("PWA");
        }
        return ResponseEntity.ok(notificationRuleService.createRule(dto));
    }

    @PutMapping("/rules/{id}")
    @RequirePermission(code = "it:pwa:write", anyOf = {"it:pwa:manage", "it:write", "admin:write"})
    public ResponseEntity<NotificationRuleDTO> updateRule(
            @PathVariable UUID id,
            @RequestBody NotificationRuleDTO dto) {
        return ResponseEntity.ok(notificationRuleService.updateRule(id, dto));
    }

    @DeleteMapping("/rules/{id}")
    @RequirePermission(code = "it:pwa:write", anyOf = {"it:pwa:manage", "it:write", "admin:write"})
    public ResponseEntity<Map<String, Object>> deleteRule(@PathVariable UUID id) {
        notificationRuleService.deleteRule(id);
        return ResponseEntity.ok(Map.of("success", true, "id", id.toString()));
    }

    @PatchMapping("/rules/{id}/toggle")
    @RequirePermission(code = "it:pwa:write", anyOf = {"it:pwa:manage", "it:write", "admin:write"})
    public ResponseEntity<NotificationRuleDTO> toggleRule(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> payload) {
        boolean active = payload != null && Boolean.TRUE.equals(payload.get("active"));
        return ResponseEntity.ok(notificationRuleService.toggleActive(id, active));
    }

    @PostMapping("/send-test")
    @RequirePermission(code = "it:pwa:write", anyOf = {"it:pwa:manage", "it:write", "admin:write"})
    public ResponseEntity<Map<String, Object>> sendTestMessage(@RequestBody PwaSendTestDTO dto) {
        if (dto == null || dto.getTitle() == null || dto.getTitle().isBlank() ||
                dto.getBody() == null || dto.getBody().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Titlul și conținutul notificării sunt obligatorii."
            ));
        }

        String targetVal = dto.getTargetValue();
        if (targetVal == null || targetVal.isBlank()) {
            targetVal = dto.getUserId();
        }
        pwaNotificationService.sendPushAsync(dto.getTitle(), dto.getBody(), dto.getActionUrl(), dto.getTargetAudience(), targetVal);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notificarea de test PWA a fost expediată cu succes!"
        ));
    }

    @PostMapping("/subscribe")
    @RequirePermission(code = "general:read", anyOf = {"general:calendar:read", "hr:attendance:write", "admin:read"})
    public ResponseEntity<Map<String, Object>> subscribe(@RequestBody Map<String, Object> subscription,
                                                         HttpServletRequest request,
                                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        UUID userId = extractUserIdFromRequest(request, authHeader);
        String userAgent = request.getHeader("User-Agent");
        pwaNotificationService.registerSubscription(userId, subscription, userAgent);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/unsubscribe")
    @RequirePermission(code = "general:read", anyOf = {"general:calendar:read", "hr:attendance:write", "admin:read"})
    public ResponseEntity<Map<String, Object>> unsubscribe(@RequestBody Map<String, String> payload) {
        String endpoint = payload != null ? payload.get("endpoint") : null;
        pwaNotificationService.unregisterSubscription(endpoint);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private UUID extractUserIdFromRequest(HttpServletRequest request, String authHeader) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (request != null && request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("adminToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        if (token == null || token.isBlank()) {
            return null;
        }
        return jwtService.extractUserId(token);
    }
}
