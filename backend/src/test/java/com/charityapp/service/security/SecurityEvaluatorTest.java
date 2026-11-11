package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.service.security.SecurityEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SecurityEvaluatorTest {
    private AdminUserRepository adminUserRepository;
    private SecurityEvaluator securityEvaluator;

    private UUID userId;
    private UUID scopeId;

    @BeforeEach
    void setUp() {
        adminUserRepository = mock(AdminUserRepository.class);
        securityEvaluator = new SecurityEvaluator(adminUserRepository);

        userId = UUID.randomUUID();
        scopeId = UUID.randomUUID();
    }

    @Test
    void testSuperAdminHasAllPermissions() {
        AdminUser admin = new AdminUser("Admin", "admin@test.org", "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        admin.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(admin));

        assertTrue(securityEvaluator.hasPermission(userId, "finance:expense:create", ScopeType.PROJECT, scopeId));
        assertTrue(securityEvaluator.hasPermission(userId, "any:action", ScopeType.PROJECT, scopeId));
    }

    @Test
    void testNonApprovedUserDeniesAll() {
        AdminUser pending = new AdminUser("Pending User", "pending@test.org", "hash", AdminStatus.PENDING_APPROVAL, AdminRole.ADMIN);
        pending.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(pending));

        assertFalse(securityEvaluator.hasPermission(userId, "finance:expense:create", ScopeType.PROJECT, scopeId));
    }

    @Test
    void testVolunteerCannotAccessDepartmentReadData() {
        com.charityapp.model.auth.AdminUser volunteer = new com.charityapp.model.auth.AdminUser(
            "Volunteer User", "vol@test.org", "hash",
            com.charityapp.model.auth.AdminStatus.APPROVED,
            com.charityapp.model.auth.AdminRole.VOLUNTEER
        );
        volunteer.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(volunteer));

        assertFalse(securityEvaluator.hasPermission(userId, "finance:read", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "donations:read", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "hr:read", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "legal:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "general:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "general:event:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "general:task:read", ScopeType.GLOBAL, null));
    }

    @Test
    void testFinanceRoleCanAccessFinanceRead() {
        com.charityapp.model.auth.AdminUser finUser = new com.charityapp.model.auth.AdminUser(
            "Finance User", "fin@test.org", "hash",
            com.charityapp.model.auth.AdminStatus.APPROVED,
            com.charityapp.model.auth.AdminRole.FINANCE_HEAD
        );
        finUser.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(finUser));

        assertTrue(securityEvaluator.hasPermission(userId, "finance:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "finance:expense:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "finance:expense:write", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "hr:read", ScopeType.GLOBAL, null));
    }

    @Test
    void testFinanceMemberHasReadAccessOnlyAndCannotWrite() {
        com.charityapp.model.auth.AdminUser memberUser = new com.charityapp.model.auth.AdminUser(
            "Finance Member", "fin_mem@test.org", "hash",
            com.charityapp.model.auth.AdminStatus.APPROVED,
            com.charityapp.model.auth.AdminRole.FINANCE_MEMBER
        );
        memberUser.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(memberUser));

        // Read permissions allowed
        assertTrue(securityEvaluator.hasPermission(userId, "finance:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "finance:expense:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "general:read", ScopeType.GLOBAL, null));

        // Write/mutation permissions blocked (preventing privilege escalation)
        assertFalse(securityEvaluator.hasPermission(userId, "finance:expense:write", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "finance:expense:create", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "finance:expense:delete", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "finance:expense:approve", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "hr:read", ScopeType.GLOBAL, null));
    }

    @Test
    void testHrMemberHasReadAccessOnlyAndCannotWrite() {
        com.charityapp.model.auth.AdminUser hrMember = new com.charityapp.model.auth.AdminUser(
            "HR Member", "hr_mem@test.org", "hash",
            com.charityapp.model.auth.AdminStatus.APPROVED,
            com.charityapp.model.auth.AdminRole.HR_MEMBER
        );
        hrMember.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(hrMember));

        assertTrue(securityEvaluator.hasPermission(userId, "hr:read", ScopeType.GLOBAL, null));
        assertTrue(securityEvaluator.hasPermission(userId, "hr:stand:read", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "hr:stand:write", ScopeType.GLOBAL, null));
        assertFalse(securityEvaluator.hasPermission(userId, "hr:stand:delete", ScopeType.GLOBAL, null));
    }

    @Test
    void testDynamicRolePermissionsFromRepository() {
        com.charityapp.repository.auth.PermissionRepository permissionRepository =
                mock(com.charityapp.repository.auth.PermissionRepository.class);
        SecurityEvaluator dynamicEvaluator = new SecurityEvaluator(adminUserRepository, permissionRepository);

        AdminUser customUser = new AdminUser(
                "Custom Volunteer", "custom@test.org", "hash",
                AdminStatus.APPROVED, AdminRole.VOLUNTEER
        );
        customUser.setId(userId);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(customUser));
        when(permissionRepository.findPermissionCodesByRoleNames(java.util.List.of("VOLUNTEER")))
                .thenReturn(java.util.List.of("general:read", "logistics:inventory:read"));

        // Granted via dynamic config
        assertTrue(dynamicEvaluator.hasPermission(userId, "general:read", ScopeType.GLOBAL, null));
        assertTrue(dynamicEvaluator.hasPermission(userId, "logistics:inventory:read", ScopeType.GLOBAL, null));

        // Blocked because not in dynamic permission set
        assertFalse(dynamicEvaluator.hasPermission(userId, "finance:expense:write", ScopeType.GLOBAL, null));

        // Cache clear works
        dynamicEvaluator.clearPermissionCache();
    }
}
