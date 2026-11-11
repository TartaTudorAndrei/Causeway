package com.charityapp.controller.general;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.model.general.GeneralDepartment;
import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.general.GeneralTask;
import com.charityapp.service.general.GeneralService;
import com.charityapp.service.security.SecurityEvaluator;
import com.charityapp.service.auth.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/general")
public class GeneralController {

    private final GeneralService generalService;
    private final SecurityEvaluator securityEvaluator;
    private final JwtService jwtService;

    public GeneralController(GeneralService generalService, SecurityEvaluator securityEvaluator, JwtService jwtService) {
        this.generalService = generalService;
        this.securityEvaluator = securityEvaluator;
        this.jwtService = jwtService;
    }

    private void checkSectionPermission(HttpServletRequest request, String sectionKey, String action) {
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Lipsa token autentificare.");
        }
        UUID userId = jwtService.extractUserId(token);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid sau expirat.");
        }
        String cleanKey = sectionKey.toLowerCase().trim();
        String specificCode = "general:info:" + cleanKey + ":" + action;
        String wildcardCode = "general:info:" + action;
        String moduleCode = "edit".equalsIgnoreCase(action) ? "general:write" : "general:read";

        boolean hasPerm = securityEvaluator.hasPermission(userId, specificCode, com.charityapp.model.auth.ScopeType.GLOBAL, null)
                || securityEvaluator.hasPermission(userId, wildcardCode, com.charityapp.model.auth.ScopeType.GLOBAL, null)
                || securityEvaluator.hasPermission(userId, moduleCode, com.charityapp.model.auth.ScopeType.GLOBAL, null);

        if (!hasPerm) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuzat: lipsa permisiune " + specificCode);
        }
    }

    // ================= DEPARTMENTS =================

    @GetMapping("/departments")
    public ResponseEntity<List<GeneralDepartment>> getAllDepartments() {
        return ResponseEntity.ok(generalService.getAllDepartments());
    }

    @PostMapping("/departments")
    @RequirePermission(code = "general:tasks:write", anyOf = {"general:task:write", "general:write"})
    public ResponseEntity<GeneralDepartment> createDepartment(@RequestBody GeneralDepartment department) {
        GeneralDepartment created = generalService.createDepartment(department);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/departments/{id}")
    @RequirePermission(code = "general:tasks:write", anyOf = {"general:task:write", "general:write"})
    public ResponseEntity<GeneralDepartment> updateDepartment(@PathVariable String id, @RequestBody GeneralDepartment department) {
        GeneralDepartment updated = generalService.updateDepartment(id, department);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/departments/{id}")
    @RequirePermission(code = "general:tasks:write", anyOf = {"general:task:write", "general:write"})
    public ResponseEntity<Void> deleteDepartment(@PathVariable String id) {
        generalService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    // ================= EVENTS =================

    @GetMapping("/events")
    @RequirePermission(code = "general:calendar:events:read", anyOf = {"general:event:read", "general:calendar:read", "general:calendar:view", "general:read"})
    public ResponseEntity<List<GeneralEvent>> getAllEvents() {
        return ResponseEntity.ok(generalService.getAllEvents());
    }

    @GetMapping("/events/{id}")
    @RequirePermission(code = "general:calendar:events:read", anyOf = {"general:event:read", "general:calendar:read", "general:calendar:view", "general:read"})
    public ResponseEntity<GeneralEvent> getEventById(@PathVariable UUID id) {
        GeneralEvent event = generalService.getEventById(id);
        if (event == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(event);
    }

    @PostMapping("/events")
    @RequirePermission(code = "general:calendar:events:write", anyOf = {"general:event:write", "general:calendar:write", "general:write"})
    public ResponseEntity<GeneralEvent> createEvent(@RequestBody GeneralEvent event) {
        GeneralEvent created = generalService.createEvent(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/events/{id}")
    @RequirePermission(code = "general:calendar:events:write", anyOf = {"general:event:write", "general:calendar:write", "general:write"})
    public ResponseEntity<GeneralEvent> updateEvent(@PathVariable UUID id, @RequestBody GeneralEvent event) {
        GeneralEvent updated = generalService.updateEvent(id, event);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/events/{id}")
    @RequirePermission(code = "general:calendar:events:delete", anyOf = {"general:calendar:events:write", "general:event:write", "general:write"})
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        generalService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // ================= TASKS =================

    @GetMapping("/tasks")
    @RequirePermission(code = "general:tasks:read", anyOf = {"general:task:read", "general:tasks:view", "general:read"})
    public ResponseEntity<List<GeneralTask>> getAllTasks() {
        return ResponseEntity.ok(generalService.getAllTasks());
    }

    @GetMapping("/tasks/{id}")
    @RequirePermission(code = "general:tasks:read", anyOf = {"general:task:read", "general:tasks:view", "general:read"})
    public ResponseEntity<GeneralTask> getTaskById(@PathVariable UUID id) {
        GeneralTask task = generalService.getTaskById(id);
        if (task == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(task);
    }

    @PostMapping("/tasks")
    @RequirePermission(code = "general:tasks:write", anyOf = {"general:task:write", "general:write"})
    public ResponseEntity<GeneralTask> createTask(@RequestBody GeneralTask task) {
        GeneralTask created = generalService.createTask(task);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/tasks/{id}")
    @RequirePermission(code = "general:tasks:write", anyOf = {"general:task:write", "general:write"})
    public ResponseEntity<GeneralTask> updateTask(@PathVariable UUID id, @RequestBody GeneralTask task) {
        GeneralTask updated = generalService.updateTask(id, task);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/tasks/{id}")
    @RequirePermission(code = "general:tasks:delete", anyOf = {"general:tasks:write", "general:task:write", "general:write"})
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        generalService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    // ================= LOCATIONS =================

    @GetMapping("/locations")
    @RequirePermission(code = "general:locations:read", anyOf = {"general:location:read", "general:map:view", "general:map:read", "general:read"})
    public ResponseEntity<List<com.charityapp.model.general.GeneralLocation>> getAllLocations() {
        return ResponseEntity.ok(generalService.getAllLocations());
    }

    @GetMapping("/locations/{id}")
    @RequirePermission(code = "general:locations:read", anyOf = {"general:location:read", "general:map:view", "general:map:read", "general:read"})
    public ResponseEntity<com.charityapp.model.general.GeneralLocation> getLocationById(@PathVariable UUID id) {
        com.charityapp.model.general.GeneralLocation loc = generalService.getLocationById(id);
        if (loc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(loc);
    }

    @PostMapping("/locations")
    @RequirePermission(code = "general:locations:write", anyOf = {"general:location:write", "general:write"})
    public ResponseEntity<com.charityapp.model.general.GeneralLocation> createLocation(@RequestBody com.charityapp.model.general.GeneralLocation location) {
        com.charityapp.model.general.GeneralLocation created = generalService.createLocation(location);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/locations/{id}")
    @RequirePermission(code = "general:locations:write", anyOf = {"general:location:write", "general:write"})
    public ResponseEntity<com.charityapp.model.general.GeneralLocation> updateLocation(@PathVariable UUID id, @RequestBody com.charityapp.model.general.GeneralLocation location) {
        com.charityapp.model.general.GeneralLocation updated = generalService.updateLocation(id, location);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/locations/{id}")
    @RequirePermission(code = "general:locations:delete", anyOf = {"general:locations:write", "general:location:write", "general:write"})
    public ResponseEntity<Void> deleteLocation(@PathVariable UUID id) {
        generalService.deleteLocation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/info")
    @RequirePermission(code = "general:info:view", anyOf = {"general:read", "general:calendar:view"})
    public ResponseEntity<List<com.charityapp.model.general.DashboardSectionInfo>> getAllSectionInfo() {
        return ResponseEntity.ok(generalService.getAllSectionInfo());
    }

    @GetMapping("/info/{sectionKey}")
    public ResponseEntity<com.charityapp.model.general.DashboardSectionInfo> getSectionInfoByKey(
            @PathVariable String sectionKey,
            HttpServletRequest request) {
        checkSectionPermission(request, sectionKey, "view");
        return ResponseEntity.ok(generalService.getSectionInfoByKey(sectionKey));
    }

    @PutMapping("/info/{sectionKey}")
    public ResponseEntity<com.charityapp.model.general.DashboardSectionInfo> upsertSectionInfo(
            @PathVariable String sectionKey,
            @RequestBody com.charityapp.model.general.DashboardSectionInfo body,
            @RequestHeader(value = "X-Actor-Email", required = false) String actorEmail,
            HttpServletRequest request) {
        checkSectionPermission(request, sectionKey, "edit");
        String updater = actorEmail != null ? actorEmail : "admin";
        return ResponseEntity.ok(generalService.upsertSectionInfo(
                sectionKey,
                body.getTitle() != null ? body.getTitle() : sectionKey,
                body.getContentMarkdown() != null ? body.getContentMarkdown() : "",
                body.getGoogleDocUrl(),
                updater
        ));
    }

    @PostMapping("/info/proxy-gdoc")
    @RequirePermission(code = "general:info:edit", anyOf = {"general:write"})
    public ResponseEntity<String> proxyGoogleDocHtml(@RequestBody java.util.Map<String, String> payload) {
        String docUrl = payload.get("url");
        if (docUrl == null || docUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("URL is required");
        }
        // Extract doc ID
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("/document/d/([a-zA-Z0-9-_]+)");
        java.util.regex.Matcher matcher = pattern.matcher(docUrl);
        if (!matcher.find()) {
            return ResponseEntity.badRequest().body("Invalid Google Docs URL format");
        }
        String docId = matcher.group(1);
        String exportUrl = "https://docs.google.com/feeds/download/documents/export/Export?id=" + docId + "&exportFormat=html";
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .followRedirects(java.net.http.HttpClient.Redirect.ALWAYS)
                    .build();
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(exportUrl))
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> res = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 400) {
                return ResponseEntity.status(res.statusCode()).body("Google Doc export failed or requires public access.");
            }
            return ResponseEntity.ok(res.body());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error exporting Google Doc: " + e.getMessage());
        }
    }
}
