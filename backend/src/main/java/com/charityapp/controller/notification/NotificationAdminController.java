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
import com.charityapp.model.auth.AdminUser;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.service.notification.PwaNotificationService;
import com.charityapp.service.notification.WhatsAppNotificationService;
import com.charityapp.service.general.NotificationRuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/notifications")
public class NotificationAdminController {

    private final NotificationRuleService notificationRuleService;
    private final WhatsAppNotificationService whatsAppService;
    private final PwaNotificationService pwaNotificationService;
    private final AdminUserRepository adminUserRepository;

    public NotificationAdminController(NotificationRuleService notificationRuleService,
                                       WhatsAppNotificationService whatsAppService,
                                       PwaNotificationService pwaNotificationService,
                                       AdminUserRepository adminUserRepository) {
        this.notificationRuleService = notificationRuleService;
        this.whatsAppService = whatsAppService;
        this.pwaNotificationService = pwaNotificationService;
        this.adminUserRepository = adminUserRepository;
    }

    @GetMapping("/rules")
    @RequirePermission(code = "it:notifications:read", anyOf = {"it:read", "admin:read", "it:whatsapp:read", "it:pwa:read", "it:notifications:view", "admin:whatsapp:view", "admin:pwa:view"})
    public ResponseEntity<List<NotificationRuleDTO>> getRules(
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(notificationRuleService.getAllRules(channel, category));
    }

    @PostMapping("/rules")
    @RequirePermission(code = "it:notifications:write", anyOf = {"it:write", "admin:write", "it:whatsapp:write", "it:pwa:write", "it:whatsapp:manage", "it:pwa:manage"})
    public ResponseEntity<NotificationRuleDTO> createRule(@RequestBody NotificationRuleDTO dto) {
        return ResponseEntity.ok(notificationRuleService.createRule(dto));
    }

    @PutMapping("/rules/{id}")
    @RequirePermission(code = "it:notifications:write", anyOf = {"it:write", "admin:write", "it:whatsapp:write", "it:pwa:write", "it:whatsapp:manage", "it:pwa:manage"})
    public ResponseEntity<NotificationRuleDTO> updateRule(
            @PathVariable UUID id,
            @RequestBody NotificationRuleDTO dto) {
        return ResponseEntity.ok(notificationRuleService.updateRule(id, dto));
    }

    @DeleteMapping("/rules/{id}")
    @RequirePermission(code = "it:notifications:write", anyOf = {"it:write", "admin:write", "it:whatsapp:write", "it:pwa:write", "it:whatsapp:manage", "it:pwa:manage"})
    public ResponseEntity<Map<String, Object>> deleteRule(@PathVariable UUID id) {
        notificationRuleService.deleteRule(id);
        return ResponseEntity.ok(Map.of("success", true, "id", id.toString()));
    }

    @PatchMapping("/rules/{id}/toggle")
    @RequirePermission(code = "it:notifications:write", anyOf = {"it:write", "admin:write", "it:whatsapp:write", "it:pwa:write", "it:whatsapp:manage", "it:pwa:manage"})
    public ResponseEntity<NotificationRuleDTO> toggleRule(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> payload) {
        boolean active = payload != null && Boolean.TRUE.equals(payload.get("active"));
        return ResponseEntity.ok(notificationRuleService.toggleActive(id, active));
    }

    @GetMapping("/triggers")
    @RequirePermission(code = "it:notifications:read", anyOf = {"it:read", "admin:read", "it:whatsapp:read", "it:pwa:read", "it:notifications:view", "admin:whatsapp:view", "admin:pwa:view"})
    public ResponseEntity<List<TriggerMetadataDTO>> getTriggerCatalog() {
        return ResponseEntity.ok(notificationRuleService.getTriggerCatalog());
    }

    @GetMapping("/users")
    @RequirePermission(code = "it:notifications:read", anyOf = {"it:read", "admin:read", "it:whatsapp:read", "it:pwa:read", "it:notifications:view", "admin:whatsapp:view", "admin:pwa:view"})
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        List<AdminUser> all = adminUserRepository.findAll();
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
    @RequirePermission(code = "it:notifications:read", anyOf = {"it:read", "admin:read", "it:whatsapp:read", "it:pwa:read", "it:notifications:view", "admin:whatsapp:view", "admin:pwa:view"})
    public ResponseEntity<List<Map<String, String>>> getRoles() {
        return ResponseEntity.ok(whatsAppService.getAvailableRoles());
    }

    @GetMapping("/active-stands")
    @RequirePermission(code = "it:notifications:read", anyOf = {"it:read", "admin:read", "it:whatsapp:read", "it:pwa:read", "it:notifications:view", "admin:whatsapp:view", "admin:pwa:view"})
    public ResponseEntity<List<Map<String, Object>>> getActiveStands() {
        return ResponseEntity.ok(whatsAppService.getIncompleteStands());
    }
}
