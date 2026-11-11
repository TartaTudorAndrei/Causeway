package com.charityapp.controller.admin;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.config.*;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.general.DynamicConfigService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminConfigController {

    private final DynamicConfigService configService;
    private final JwtService jwtService;

    public AdminConfigController(DynamicConfigService configService, JwtService jwtService) {
        this.configService = configService;
        this.jwtService = jwtService;
    }

    @GetMapping("/config/status")
    public ResponseEntity<ConfigStatusResponse> getStatus() {
        boolean enabled = configService.isUiConfigEnabled();
        boolean restartReq = configService.isRestartRequired();
        int total = enabled ? configService.getAllConfigs().size() : 0;
        return ResponseEntity.ok(new ConfigStatusResponse(enabled, restartReq, total));
    }

    @GetMapping("/config")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "it:config:read", "admin:all", "it:all"})
    public ResponseEntity<List<ConfigItemDTO>> getAllConfigs() {
        if (!configService.isUiConfigEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "UI_CONFIGURATION_LOCKED_BY_HOST: Modificările prin interfață sunt dezactivate.");
        }
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    @PostMapping("/config/batch")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<Map<String, Object>> updateBatch(
            @RequestBody ConfigBatchUpdateRequest requestDto,
            HttpServletRequest request) {

        UUID actorId = getRequiredUserId(request);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        Map<String, Object> result = configService.updateConfigs(
                requestDto.getValues(),
                actorId,
                requestDto.getPassword(),
                requestDto.getTotpCode(),
                ip,
                ua
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/config/reveal")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<Map<String, String>> revealSecret(
            @RequestBody ConfigRevealRequest requestDto,
            HttpServletRequest request) {

        UUID actorId = getRequiredUserId(request);
        String secret = configService.revealSecret(
                requestDto.getKey(),
                actorId,
                requestDto.getPassword(),
                requestDto.getTotpCode()
        );
        return ResponseEntity.ok(Map.of("key", requestDto.getKey(), "value", secret));
    }

    @GetMapping("/config/snapshots")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "it:config:read", "admin:all", "it:all"})
    public ResponseEntity<List<ConfigSnapshotDTO>> getSnapshots() {
        return ResponseEntity.ok(configService.getSnapshots());
    }

    @PostMapping("/config/snapshots")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<Map<String, String>> createSnapshot(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {

        UUID actorId = getRequiredUserId(request);
        String label = (body != null) ? body.get("label") : null;
        configService.createManualSnapshot(label, actorId);
        return ResponseEntity.ok(Map.of("message", "Snapshot creat cu succes."));
    }

    @PostMapping("/config/snapshots/{id}/rollback")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<Map<String, String>> rollbackToSnapshot(
            @PathVariable UUID id,
            @RequestBody ConfigRollbackRequest requestDto,
            HttpServletRequest request) {

        UUID actorId = getRequiredUserId(request);
        configService.rollbackToSnapshot(id, actorId, requestDto.getPassword(), requestDto.getTotpCode());
        return ResponseEntity.ok(Map.of("message", "Configurarea a fost restaurată cu succes la starea anterioară."));
    }

    // Diagnostics tests
    @PostMapping("/config/test-stripe")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<TestConnectionResponse> testStripe(@RequestBody(required = false) TestConnectionRequest req) {
        String key = (req != null) ? req.getSecretKey() : null;
        return ResponseEntity.ok(configService.testStripeConnection(key));
    }

    @PostMapping("/config/test-email")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<TestConnectionResponse> testEmail(@RequestBody(required = false) TestConnectionRequest req) {
        String host = (req != null) ? req.getSmtpHost() : null;
        Integer port = (req != null) ? req.getSmtpPort() : null;
        String user = (req != null) ? req.getSmtpUsername() : null;
        String pass = (req != null) ? req.getSmtpPassword() : null;
        String target = (req != null) ? req.getTargetEmail() : null;
        return ResponseEntity.ok(configService.testEmailConnection(host, port, user, pass, target));
    }

    @PostMapping("/config/test-gemini")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<TestConnectionResponse> testGemini(@RequestBody(required = false) TestConnectionRequest req) {
        String key = (req != null) ? req.getGeminiApiKey() : null;
        String model = (req != null) ? req.getGeminiModel() : null;
        return ResponseEntity.ok(configService.testGeminiConnection(key, model));
    }

    @PostMapping("/system/restart")
    @RequirePermission(code = "SYSTEM_CONFIG_MANAGE", anyOf = {"it:config:manage", "admin:all", "it:all"})
    public ResponseEntity<Map<String, Object>> acknowledgeRestart(HttpServletRequest request) {
        UUID actorId = getRequiredUserId(request);
        configService.acknowledgeRestart(actorId);
        return ResponseEntity.ok(Map.of(
                "message", "Semnalul de repornire a fost înregistrat cu succes.",
                "restartRequired", false
        ));
    }

    private UUID getRequiredUserId(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Lipsă token autentificare.");
        }
        UUID userId = jwtService.extractUserId(token);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid sau expirat.");
        }
        return userId;
    }

    private String extractToken(HttpServletRequest request) {
        if (request == null) return null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("adminToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
