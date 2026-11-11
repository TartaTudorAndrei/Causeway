package com.charityapp.controller.admin;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.common.ActionResponseDTO;
import com.charityapp.dto.admin.RoleWithPermissionsDTO;
import com.charityapp.dto.admin.UpdateRolePermissionsDTO;
import com.charityapp.model.auth.Permission;
import com.charityapp.model.auth.Role;
import com.charityapp.repository.auth.PermissionRepository;
import com.charityapp.repository.auth.RoleRepository;
import com.charityapp.service.general.AuditLogService;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.auth.RoleManagementService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RolePermissionControllerTest {

    private RoleRepository roleRepository;
    private PermissionRepository permissionRepository;
    private RoleManagementService roleManagementService;
    private AuditLogService auditLogService;
    private JwtService jwtService;
    private RolePermissionController controller;
    private HttpServletRequest mockRequest;

    @BeforeEach
    void setUp() {
        roleRepository = mock(RoleRepository.class);
        permissionRepository = mock(PermissionRepository.class);
        roleManagementService = mock(RoleManagementService.class);
        auditLogService = mock(AuditLogService.class);
        jwtService = mock(JwtService.class);
        mockRequest = mock(HttpServletRequest.class);

        controller = new RolePermissionController(
                roleRepository,
                permissionRepository,
                roleManagementService,
                auditLogService,
                jwtService
        );
    }

    @Test
    void testGetAllPermissions() {
        Permission p1 = new Permission("general:read", "Read general", "GENERAL");
        Permission p2 = new Permission("finance:read", "Read finance", "FINANCE");
        when(permissionRepository.findAll()).thenReturn(List.of(p1, p2));

        ResponseEntity<List<Permission>> res = controller.getAllPermissions();
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(2, res.getBody().size());
    }

    @Test
    void testGetRolesWithPermissions() {
        UUID roleId = UUID.randomUUID();
        RoleWithPermissionsDTO dto = new RoleWithPermissionsDTO(
                roleId,
                "HR_MEMBER",
                "HR Member description",
                true,
                null,
                List.of(UUID.randomUUID()),
                List.of("hr:read")
        );
        when(roleManagementService.getRolesWithPermissions()).thenReturn(List.of(dto));

        ResponseEntity<List<RoleWithPermissionsDTO>> res = controller.getRolesWithPermissions();
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().size());
        assertEquals("HR_MEMBER", res.getBody().get(0).getName());
        assertEquals(1, res.getBody().get(0).getPermissionIds().size());
    }

    @Test
    void testUpdateRolePermissionsSuccess() {
        UUID roleId = UUID.randomUUID();
        UUID permId = UUID.randomUUID();
        UpdateRolePermissionsDTO dto = new UpdateRolePermissionsDTO(List.of(permId));

        ResponseEntity<ActionResponseDTO> res = controller.updateRolePermissions(roleId, dto, null, mockRequest);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertTrue(res.getBody().isSuccess());

        verify(roleManagementService).updateRolePermissions(eq(roleId), eq(dto), any());
    }
}
