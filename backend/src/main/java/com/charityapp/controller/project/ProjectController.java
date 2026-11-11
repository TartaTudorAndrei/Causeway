package com.charityapp.controller.project;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.project.CreateProjectRequest;
import com.charityapp.dto.project.ProjectPresetDefinition;
import com.charityapp.dto.project.ProjectResponse;
import com.charityapp.dto.project.UpdateProjectModulesRequest;
import com.charityapp.dto.project.UpdateProjectRequest;
import com.charityapp.model.project.ProjectModuleDescriptor;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.project.ProjectService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final JwtService jwtService;

    public ProjectController(ProjectService projectService, JwtService jwtService) {
        this.projectService = projectService;
        this.jwtService = jwtService;
    }

    @GetMapping
    @RequirePermission(code = "projects:read", anyOf = {"projects:manage", "projects:write"})
    public ResponseEntity<List<ProjectResponse>> listProjects(@RequestParam(value = "entityId", required = false) UUID entityId) {
        return ResponseEntity.ok(projectService.listProjects(entityId));
    }

    @GetMapping("/{id}")
    @RequirePermission(code = "projects:read", anyOf = {"projects:manage", "projects:write"})
    public ResponseEntity<ProjectResponse> getProject(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @GetMapping("/slug/{slug}")
    @RequirePermission(code = "projects:read", anyOf = {"projects:manage", "projects:write"})
    public ResponseEntity<ProjectResponse> getProjectBySlug(@PathVariable("slug") String slug) {
        return ResponseEntity.ok(projectService.getProjectBySlug(slug));
    }

    @PostMapping
    @RequirePermission(code = "projects:write", anyOf = {"projects:manage"})
    public ResponseEntity<ProjectResponse> createProject(
            @RequestBody CreateProjectRequest request,
            HttpServletRequest httpRequest,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        UUID userId = extractUserId(httpRequest, authHeader);
        ProjectResponse response = projectService.createProject(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequirePermission(code = "projects:write", anyOf = {"projects:manage"})
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable("id") UUID id,
            @RequestBody UpdateProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @PutMapping("/{id}/modules")
    @RequirePermission(code = "projects:modules:manage", anyOf = {"projects:manage"})
    public ResponseEntity<ProjectResponse> updateProjectModules(
            @PathVariable("id") UUID id,
            @RequestBody UpdateProjectModulesRequest request,
            HttpServletRequest httpRequest,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        UUID userId = extractUserId(httpRequest, authHeader);
        return ResponseEntity.ok(projectService.updateProjectModules(id, request, userId));
    }

    @DeleteMapping("/{id}")
    @RequirePermission(code = "projects:delete", anyOf = {"projects:manage", "projects:write"})
    public ResponseEntity<Void> deleteProject(
            @PathVariable("id") UUID id,
            HttpServletRequest httpRequest,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        UUID userId = extractUserId(httpRequest, authHeader);
        projectService.deleteProject(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/meta/presets")
    @RequirePermission(code = "projects:read", anyOf = {"projects:write", "projects:manage"})
    public ResponseEntity<List<ProjectPresetDefinition>> getPresets() {
        return ResponseEntity.ok(projectService.getPresets());
    }

    @GetMapping("/meta/registry")
    @RequirePermission(code = "projects:read", anyOf = {"projects:write", "projects:manage"})
    public ResponseEntity<List<ProjectModuleDescriptor>> getRegistry() {
        return ResponseEntity.ok(projectService.getModuleRegistry());
    }

    private UUID extractUserId(HttpServletRequest request, String authHeader) {
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
        try {
            return jwtService.extractUserId(token);
        } catch (Exception ignored) {
            return null;
        }
    }
}
