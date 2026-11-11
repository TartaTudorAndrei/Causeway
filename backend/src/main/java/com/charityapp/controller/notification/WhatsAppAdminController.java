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
import com.charityapp.dto.notification.TriggerMetadataDTO;
import com.charityapp.service.notification.WhatsAppNotificationService;
import com.charityapp.service.general.NotificationRuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/whatsapp")
public class WhatsAppAdminController {

    private final WhatsAppNotificationService whatsAppService;
    private final NotificationRuleService notificationRuleService;
    private final com.charityapp.repository.auth.AdminUserRepository adminUserRepository;

    public WhatsAppAdminController(WhatsAppNotificationService whatsAppService,
                                   NotificationRuleService notificationRuleService,
                                   com.charityapp.repository.auth.AdminUserRepository adminUserRepository) {
        this.whatsAppService = whatsAppService;
        this.notificationRuleService = notificationRuleService;
        this.adminUserRepository = adminUserRepository;
    }

    @GetMapping("/status")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(whatsAppService.getWhatsAppStatus());
    }

    @GetMapping("/qr")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<Map<String, Object>> getQrCode() {
        return ResponseEntity.ok(whatsAppService.getWhatsAppQr());
    }

    @GetMapping("/groups")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<List<Map<String, Object>>> getGroups() {
        return ResponseEntity.ok(whatsAppService.getWhatsAppGroups());
    }

    @GetMapping("/users")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<List<Map<String, Object>>> getWhatsAppUsers() {
        List<com.charityapp.model.auth.AdminUser> all = adminUserRepository.findAll();
        List<Map<String, Object>> result = all.stream()
                .map(u -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", u.getId().toString());
                    map.put("fullName", u.getFullName() != null ? u.getFullName() : "");
                    map.put("email", u.getEmail() != null ? u.getEmail() : "");
                    map.put("phone", u.getPhone() != null ? u.getPhone() : "");
                    return map;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/roles")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<List<Map<String, String>>> getWhatsAppRoles() {
        return ResponseEntity.ok(whatsAppService.getAvailableRoles());
    }

    @GetMapping("/active-stands")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<List<Map<String, Object>>> getWhatsAppActiveStands() {
        return ResponseEntity.ok(whatsAppService.getIncompleteStands());
    }

    @GetMapping("/triggers")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<List<TriggerMetadataDTO>> getTriggerCatalog() {
        return ResponseEntity.ok(notificationRuleService.getTriggerCatalog());
    }

    @GetMapping("/rules")
    @RequirePermission(code = "it:whatsapp:read", anyOf = {"it:read", "admin:read", "it:whatsapp:view"})
    public ResponseEntity<List<NotificationRuleDTO>> getRules(
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(notificationRuleService.getAllRules("WHATSAPP", category));
    }

    @PostMapping("/rules")
    @RequirePermission(code = "it:whatsapp:write", anyOf = {"it:whatsapp:manage", "it:write", "admin:write"})
    public ResponseEntity<NotificationRuleDTO> createRule(@RequestBody NotificationRuleDTO dto) {
        if (dto != null) {
            dto.setChannel("WHATSAPP");
        }
        return ResponseEntity.ok(notificationRuleService.createRule(dto));
    }

    @PutMapping("/rules/{id}")
    @RequirePermission(code = "it:whatsapp:write", anyOf = {"it:whatsapp:manage", "it:write", "admin:write"})
    public ResponseEntity<NotificationRuleDTO> updateRule(
            @PathVariable UUID id,
            @RequestBody NotificationRuleDTO dto) {
        return ResponseEntity.ok(notificationRuleService.updateRule(id, dto));
    }

    @DeleteMapping("/rules/{id}")
    @RequirePermission(code = "it:whatsapp:write", anyOf = {"it:whatsapp:manage", "it:write", "admin:write"})
    public ResponseEntity<Map<String, Object>> deleteRule(@PathVariable UUID id) {
        notificationRuleService.deleteRule(id);
        return ResponseEntity.ok(Map.of("success", true, "id", id.toString()));
    }

    @PatchMapping("/rules/{id}/toggle")
    @RequirePermission(code = "it:whatsapp:write", anyOf = {"it:whatsapp:manage", "it:write", "admin:write"})
    public ResponseEntity<NotificationRuleDTO> toggleRule(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> payload) {
        boolean active = payload != null && Boolean.TRUE.equals(payload.get("active"));
        return ResponseEntity.ok(notificationRuleService.toggleActive(id, active));
    }

    @PostMapping("/send-manual")
    @RequirePermission(code = "it:whatsapp:write", anyOf = {"it:whatsapp:manage", "it:write", "admin:write"})
    public ResponseEntity<Map<String, Object>> sendManualMessage(@RequestBody com.charityapp.dto.notification.WhatsAppSendManualDTO dto) {
        if (dto == null || dto.getMessage() == null || dto.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Conținutul mesajului este obligatoriu."));
        }

        String targetVal = dto.getTargetValue();
        if (targetVal == null || targetVal.isBlank()) {
            targetVal = dto.getUserId() != null && !dto.getUserId().isBlank() ? dto.getUserId() : dto.getPhone();
        }

        whatsAppService.sendManualNotification(dto.getTargetAudience(), targetVal, dto.getTo(), dto.getMessage());
        return ResponseEntity.ok(Map.of("success", true, "message", "Mesajul a fost adăugat în coada de trimitere."));
    }

    @PostMapping("/send-test")
    @RequirePermission(code = "it:whatsapp:write", anyOf = {"it:whatsapp:manage", "it:write", "admin:write"})
    public ResponseEntity<Map<String, Object>> sendTestMessage(@RequestBody com.charityapp.dto.notification.WhatsAppSendManualDTO dto) {
        return sendManualMessage(dto);
    }
}
