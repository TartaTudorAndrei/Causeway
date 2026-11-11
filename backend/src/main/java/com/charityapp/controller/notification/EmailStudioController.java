package com.charityapp.controller.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.communication.EmailDispatchRequest;
import com.charityapp.dto.communication.EmailLogRequest;
import com.charityapp.dto.communication.EmailTemplateRequest;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.communication.EmailLog;
import com.charityapp.model.communication.EmailTemplate;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.communication.EmailStudioService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/admin/emails", "/api/v1/emails"})
public class EmailStudioController {

    private static final Logger log = LoggerFactory.getLogger(EmailStudioController.class);
    private final EmailStudioService emailStudioService;
    private final JwtService jwtService;
    private final AdminUserRepository adminUserRepository;

    public EmailStudioController(EmailStudioService emailStudioService,
                                 JwtService jwtService,
                                 AdminUserRepository adminUserRepository) {
        this.emailStudioService = emailStudioService;
        this.jwtService = jwtService;
        this.adminUserRepository = adminUserRepository;
    }

    @GetMapping("/templates")
    @RequirePermission(code = "fundraising:emails:view", anyOf = {"fundraising:emails:read", "pr:emails:view", "pr:emails:read", "admin:all", "it:all"})
    public ResponseEntity<List<EmailTemplate>> getTemplates(@RequestParam(required = false) String department) {
        return ResponseEntity.ok(emailStudioService.getTemplates(department));
    }

    @GetMapping("/templates/{id}")
    @RequirePermission(code = "fundraising:emails:view", anyOf = {"fundraising:emails:read", "pr:emails:view", "pr:emails:read", "admin:all", "it:all"})
    public ResponseEntity<EmailTemplate> getTemplateById(@PathVariable UUID id) {
        EmailTemplate template = emailStudioService.getTemplateById(id);
        if (template == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(template);
    }

    @PostMapping("/templates")
    @RequirePermission(code = "fundraising:templates:write", anyOf = {"pr:templates:write", "admin:all"})
    public ResponseEntity<EmailTemplate> createTemplate(@RequestBody EmailTemplateRequest req, HttpServletRequest request) {
        UUID userId = extractCurrentUserId(request);
        return ResponseEntity.ok(emailStudioService.createTemplate(req, userId));
    }

    @PutMapping("/templates/{id}")
    @RequirePermission(code = "fundraising:templates:write", anyOf = {"pr:templates:write", "admin:all"})
    public ResponseEntity<EmailTemplate> updateTemplate(@PathVariable UUID id, @RequestBody EmailTemplateRequest req) {
        return ResponseEntity.ok(emailStudioService.updateTemplate(id, req));
    }

    @DeleteMapping("/templates/{id}")
    @RequirePermission(code = "fundraising:templates:write", anyOf = {"pr:templates:write", "admin:all"})
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        boolean deleted = emailStudioService.deleteTemplate(id);
        if (!deleted) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/templates/{id}/copy")
    @RequirePermission(code = "fundraising:templates:write", anyOf = {"pr:templates:write", "admin:all"})
    public ResponseEntity<EmailTemplate> copyTemplate(@PathVariable UUID id,
                                                      @RequestBody(required = false) Map<String, String> body,
                                                      HttpServletRequest request) {
        UUID userId = extractCurrentUserId(request);
        String customName = (body != null) ? body.get("name") : null;
        EmailTemplate copied = emailStudioService.copyTemplate(id, userId, customName);
        if (copied == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(copied);
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequirePermission(code = "fundraising:templates:write", anyOf = {"pr:templates:write", "fundraising:emails:view", "pr:emails:view", "admin:all", "it:all"})
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fișierul este gol."));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "Fișierul depășește limita maximă de 5MB."));
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equalsIgnoreCase("image/jpeg") &&
                !contentType.equalsIgnoreCase("image/png") &&
                !contentType.equalsIgnoreCase("image/webp") &&
                !contentType.equalsIgnoreCase("image/gif") &&
                !contentType.equalsIgnoreCase("image/svg+xml"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format fișier nepermis. Formate acceptate: JPG, PNG, WEBP, GIF, SVG."));
        }

        try {
            String savedFileName = emailStudioService.saveEmailImage(file);
            String baseUrl = determineBaseUrl(request);
            String fullUrl = baseUrl + "/api/uploads/images/" + savedFileName;
            return ResponseEntity.ok(Map.of(
                    "url", fullUrl,
                    "fileName", savedFileName,
                    "size", file.getSize()
            ));
        } catch (Exception e) {
            log.error("Image upload failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Eroare la salvarea imaginii: " + e.getMessage()));
        }
    }

    @PostMapping("/dispatch")
    @RequirePermission(code = "fundraising:emails:send", anyOf = {"pr:emails:send", "admin:all"})
    public ResponseEntity<?> dispatchEmail(@RequestBody EmailDispatchRequest req, HttpServletRequest request) {
        try {
            UUID userId = extractCurrentUserId(request);
            EmailLog logEntry = emailStudioService.dispatchEmail(req, userId);
            return ResponseEntity.ok(logEntry);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Email dispatch failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Email dispatch error: " + e.getMessage());
        }
    }

    @PostMapping("/logs")
    @RequirePermission(code = "fundraising:emails:view", anyOf = {"fundraising:emails:read", "pr:emails:view", "pr:emails:read", "admin:all"})
    public ResponseEntity<EmailLog> recordLog(@RequestBody EmailLogRequest req, HttpServletRequest request) {
        UUID userId = extractCurrentUserId(request);
        return ResponseEntity.ok(emailStudioService.recordLog(req, userId));
    }

    @GetMapping("/logs")
    @RequirePermission(code = "fundraising:emails:view", anyOf = {"fundraising:emails:read", "pr:emails:view", "pr:emails:read", "admin:all"})
    public ResponseEntity<List<EmailLog>> getLogs(@RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(emailStudioService.getRecentLogs(limit));
    }

    private String determineBaseUrl(HttpServletRequest request) {
        if (request == null) return "";
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !"null".equalsIgnoreCase(origin.trim())) {
            return origin.trim().replaceAll("/+$", "");
        }
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                URI uri = URI.create(referer);
                if (uri.getScheme() != null && uri.getAuthority() != null) {
                    return (uri.getScheme() + "://" + uri.getAuthority()).replaceAll("/+$", "");
                }
            } catch (Exception ignored) {}
        }
        String proto = request.getHeader("X-Forwarded-Proto");
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        if (host == null || host.isBlank()) {
            host = request.getServerName() + (request.getServerPort() == 80 || request.getServerPort() == 443 ? "" : ":" + request.getServerPort());
        }
        if (proto == null || proto.isBlank()) {
            proto = request.isSecure() ? "https" : "http";
        }
        return (proto + "://" + host).replaceAll("/+$", "");
    }

    private UUID extractCurrentUserId(HttpServletRequest request) {
        if (request == null) return null;
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("adminToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        if (token == null) return null;
        try {
            String email = jwtService.extractEmail(token);
            if (email != null) {
                AdminUser user = adminUserRepository.findByEmail(email).orElse(null);
                if (user != null) return user.getId();
            }
        } catch (Exception e) {
            log.debug("Could not resolve current user from token: {}", e.getMessage());
        }
        return null;
    }
}
