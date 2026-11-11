package com.charityapp.controller.admin;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.common.ActionResponseDTO;
import com.charityapp.dto.admin.CreateCustomRoleDTO;
import com.charityapp.dto.admin.RoleWithPermissionsDTO;
import com.charityapp.dto.admin.UpdateRolePermissionsDTO;
import com.charityapp.model.auth.Permission;
import com.charityapp.model.auth.Role;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.repository.auth.PermissionRepository;
import com.charityapp.repository.auth.RoleRepository;
import com.charityapp.service.general.AuditLogService;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.auth.RoleManagementService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class RolePermissionController {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleManagementService roleManagementService;
    private final AuditLogService auditLogService;
    private final JwtService jwtService;

    public RolePermissionController(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            RoleManagementService roleManagementService,
            AuditLogService auditLogService,
            JwtService jwtService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.roleManagementService = roleManagementService;
        this.auditLogService = auditLogService;
        this.jwtService = jwtService;
    }

    @GetMapping("/permissions")
    @RequirePermission(code = "it:roles:read", anyOf = {"it:read", "admin:read", "roles:create", "roles:assign", "it:permissions:view", "it:permissions:read"})
    public ResponseEntity<List<Permission>> getAllPermissions() {
        return ResponseEntity.ok(permissionRepository.findAll());
    }

    @GetMapping("/roles-permissions")
    @RequirePermission(code = "it:roles:read", anyOf = {"it:read", "admin:read", "roles:create", "roles:assign", "it:permissions:view", "it:permissions:read"})
    public ResponseEntity<List<RoleWithPermissionsDTO>> getRolesWithPermissions() {
        return ResponseEntity.ok(roleManagementService.getRolesWithPermissions());
    }

    @GetMapping("/roles/{roleId}/permissions")
    @RequirePermission(code = "it:roles:read", anyOf = {"it:read", "admin:read", "roles:create", "roles:assign", "it:permissions:view", "it:permissions:read"})
    public ResponseEntity<List<Permission>> getPermissionsForRole(@PathVariable UUID roleId) {
        Optional<Role> roleOpt = roleRepository.findById(roleId);
        if (roleOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rolul nu a fost găsit.");
        }
        return ResponseEntity.ok(permissionRepository.findByRoleId(roleId));
    }

    @PostMapping("/roles")
    @RequirePermission(code = "it:roles:write", anyOf = {"roles:create", "it:write", "admin:write"})
    public ResponseEntity<RoleWithPermissionsDTO> createCustomRole(
            @Valid @RequestBody CreateCustomRoleDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {

        UUID actorId = tryValidateToken(request, authHeader);
        RoleWithPermissionsDTO created = roleManagementService.createCustomRole(dto, actorId);

        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        auditLogService.log(
                actorId,
                "ROLE_CREATED",
                "ROLE",
                created.getId(),
                ScopeType.GLOBAL,
                null,
                "Created custom role " + created.getName() + " with " + (created.getPermissionCodes() != null ? created.getPermissionCodes().size() : 0) + " permissions",
                ip,
                ua
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/roles/{roleId}/permissions")
    @RequirePermission(code = "it:roles:write", anyOf = {"roles:create", "it:write", "admin:write"})
    public ResponseEntity<ActionResponseDTO> updateRolePermissions(
            @PathVariable UUID roleId,
            @RequestBody UpdateRolePermissionsDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {

        UUID actorId = tryValidateToken(request, authHeader);
        roleManagementService.updateRolePermissions(roleId, dto, actorId);

        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        auditLogService.log(
                actorId,
                "ROLE_PERMISSIONS_UPDATED",
                "ROLE_PERMISSIONS",
                roleId,
                ScopeType.GLOBAL,
                null,
                "Updated permissions for role ID " + roleId + " (count: " + (dto.getPermissionIds() != null ? dto.getPermissionIds().size() : 0) + ")",
                ip,
                ua
        );

        return ResponseEntity.ok(new ActionResponseDTO(true, "Permisiunile rolului au fost actualizate cu succes."));
    }

    @DeleteMapping("/roles/{roleId}")
    @RequirePermission(code = "it:roles:delete", anyOf = {"roles:delete", "it:write", "admin:write"})
    public ResponseEntity<ActionResponseDTO> deleteRole(
            @PathVariable UUID roleId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {

        UUID actorId = tryValidateToken(request, authHeader);
        roleManagementService.deleteCustomRole(roleId, actorId);

        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        auditLogService.log(
                actorId,
                "ROLE_DELETED",
                "ROLE",
                roleId,
                ScopeType.GLOBAL,
                null,
                "Deleted custom role ID " + roleId,
                ip,
                ua
        );

        return ResponseEntity.ok(new ActionResponseDTO(true, "Rolul a fost șters cu succes."));
    }

    private UUID tryValidateToken(HttpServletRequest request, String authHeader) {
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

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
