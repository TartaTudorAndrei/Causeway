package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.*;
import com.charityapp.model.admin.*;
import com.charityapp.model.finance.*;
import com.charityapp.model.notification.*;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.auth.PermissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Evaluates permissions using database-backed dynamic RBAC with fallback to enum defaults.
 */
@Service
public class SecurityEvaluator {
    private final AdminUserRepository adminUserRepository;
    private final PermissionRepository permissionRepository;
    private final Map<String, Set<String>> permissionCache = new ConcurrentHashMap<>();

    public SecurityEvaluator(AdminUserRepository adminUserRepository) {
        this(adminUserRepository, null);
    }

    @Autowired
    public SecurityEvaluator(AdminUserRepository adminUserRepository, @Autowired(required = false) PermissionRepository permissionRepository) {
        this.adminUserRepository = adminUserRepository;
        this.permissionRepository = permissionRepository;
    }

    public void clearPermissionCache() {
        permissionCache.clear();
    }

    private Set<String> getRolePermissions(String roleName) {
        if (permissionRepository == null || roleName == null) return Collections.emptySet();
        return permissionCache.computeIfAbsent(roleName, rName -> {
            List<String> codes = permissionRepository.findPermissionCodesByRoleNames(List.of(rName));
            return new HashSet<>(codes);
        });
    }

    public boolean hasPermission(UUID userId, String permissionCode, ScopeType scopeType, UUID scopeId) {
        if (userId == null) return false;

        // 1. Verify user exists and is APPROVED
        if (adminUserRepository != null) {
            Optional<AdminUser> userOpt = adminUserRepository.findById(userId);
            if (userOpt.isPresent()) {
                AdminUser user = userOpt.get();
                if (user.getStatus() != AdminStatus.APPROVED) return false;

                List<String> roles = user.getRoles();
                for (String r : roles) {
                    if ("ADMIN".equalsIgnoreCase(r) || "SUPER_ADMIN".equalsIgnoreCase(r)) {
                        return true;
                    }
                }

                // Check dynamic DB-configured permissions if repository is available
                if (permissionRepository != null) {
                    boolean hasCustomConfig = false;
                    for (String r : roles) {
                        Set<String> perms = getRolePermissions(r);
                        if (!perms.isEmpty()) {
                            hasCustomConfig = true;
                            if (matchesGrantedPermissions(perms, permissionCode)) {
                                return true;
                            }
                        }
                    }
                    if (hasCustomConfig) {
                        return false;
                    }
                }

                // Fallback to static rules
                for (String r : roles) {
                    AdminRole adminRole = AdminRole.fromString(r);
                    if (checkRolePermission(adminRole, permissionCode)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    public static boolean matchesGrantedPermissions(Set<String> grantedPerms, String requiredPerm) {
        if (grantedPerms == null || requiredPerm == null || requiredPerm.isBlank()) return false;
        if (grantedPerms.contains("*") || grantedPerms.contains(requiredPerm)) {
            return true;
        }

        // Check all hierarchical wildcard prefixes: e.g. for "a:b:c:d" -> "a:*", "a:b:*", "a:b:c:*"
        int idx = requiredPerm.indexOf(':');
        while (idx > 0) {
            String prefix = requiredPerm.substring(0, idx);
            if (grantedPerms.contains(prefix + ":*")) {
                return true;
            }
            idx = requiredPerm.indexOf(':', idx + 1);
        }

        return false;
    }

    private boolean checkRolePermission(AdminRole role, String permissionCode) {
        if (role == null || permissionCode == null) return false;

        // General read permissions available to all authenticated approved roles
        if (permissionCode.startsWith("general:") && (permissionCode.endsWith(":read") || permissionCode.endsWith(":view") || permissionCode.equals("general:read"))) {
            return true;
        }

        if (role == AdminRole.ADMIN) {
            return true;
        }

        if (role == AdminRole.IT_ADMIN) {
            return permissionCode.startsWith("it:") || permissionCode.startsWith("auth:")
                    || permissionCode.startsWith("admin:") || permissionCode.startsWith("audit:")
                    || permissionCode.startsWith("general:");
        }

        boolean isReadPerm = permissionCode.endsWith(":read") || permissionCode.contains(":read:")
                || permissionCode.endsWith(":view") || permissionCode.contains(":view:");
        boolean isWritePerm = permissionCode.endsWith(":write") || permissionCode.contains(":write:")
                || permissionCode.endsWith(":create") || permissionCode.endsWith(":update")
                || permissionCode.endsWith(":delete") || permissionCode.endsWith(":manage")
                || permissionCode.endsWith(":assign") || permissionCode.endsWith(":approve")
                || permissionCode.endsWith(":cancel");

        if (permissionCode.equals("general:location:write")) {
            return role == AdminRole.ADMIN || role == AdminRole.IT_ADMIN
                    || role == AdminRole.HR_HEAD || role == AdminRole.LOGISTICS_HEAD;
        }

        return switch (role) {
            case ADMIN -> true;
            case IT_ADMIN -> permissionCode.startsWith("it:") || permissionCode.startsWith("auth:")
                    || permissionCode.startsWith("admin:") || permissionCode.startsWith("audit:")
                    || permissionCode.startsWith("general:");
            case FINANCE_HEAD -> permissionCode.startsWith("finance:");
            case FINANCE_MEMBER -> permissionCode.startsWith("finance:") && (isReadPerm || !isWritePerm);
            case HR_HEAD -> permissionCode.startsWith("hr:");
            case HR_MEMBER -> (permissionCode.startsWith("hr:") && (isReadPerm || !isWritePerm)) || permissionCode.equals("hr:attendance:write");
            case FUNDRAISING_HEAD -> permissionCode.startsWith("fundraising:") || permissionCode.startsWith("donations:");
            case FUNDRAISING_MEMBER -> (permissionCode.startsWith("fundraising:") || permissionCode.startsWith("donations:")) && (isReadPerm || !isWritePerm);
            case LOGISTICS_HEAD -> permissionCode.startsWith("logistics:");
            case LOGISTICS_MEMBER -> permissionCode.startsWith("logistics:") && (isReadPerm || !isWritePerm);
            case LEGAL_HEAD -> permissionCode.startsWith("legal:");
            case LEGAL_MEMBER -> permissionCode.startsWith("legal:") && (isReadPerm || !isWritePerm);
            case MARKETING_HEAD -> permissionCode.startsWith("marketing:");
            case MARKETING_MEMBER -> permissionCode.startsWith("marketing:") && (isReadPerm || !isWritePerm);
            case VOLUNTEER -> permissionCode.equals("hr:attendance:write");
            default -> false;
        };
    }
}
