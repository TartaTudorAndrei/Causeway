package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.admin.CreateCustomRoleDTO;
import com.charityapp.dto.admin.RoleWithPermissionsDTO;
import com.charityapp.dto.admin.UpdateRolePermissionsDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.Permission;
import com.charityapp.model.auth.Role;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.auth.PermissionRepository;
import com.charityapp.repository.auth.RoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoleManagementService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AdminUserRepository adminUserRepository;
    private final SecurityEvaluator securityEvaluator;

    public RoleManagementService(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            AdminUserRepository adminUserRepository,
            SecurityEvaluator securityEvaluator) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.adminUserRepository = adminUserRepository;
        this.securityEvaluator = securityEvaluator;
    }

    public List<RoleWithPermissionsDTO> getRolesWithPermissions() {
        List<Role> roles = roleRepository.findAll();
        List<RoleWithPermissionsDTO> result = new ArrayList<>();

        for (Role r : roles) {
            List<Permission> perms = permissionRepository.findByRoleId(r.getId());
            List<UUID> permIds = perms.stream().map(Permission::getId).toList();
            List<String> permCodes = perms.stream().map(Permission::getCode).toList();
            result.add(new RoleWithPermissionsDTO(
                    r.getId(),
                    r.getName(),
                    r.getDescription(),
                    r.isSystem(),
                    r.getCreatedBy(),
                    r.getParentRoleId(),
                    permIds,
                    permCodes
            ));
        }

        return result;
    }

    public Set<String> getEffectivePermissionsForUser(UUID userId) {
        if (userId == null) return Collections.emptySet();
        AdminUser user = adminUserRepository.findById(userId).orElse(null);
        if (user == null) return Collections.emptySet();

        boolean isAdmin = user.getRoles().stream()
                .anyMatch(r -> "ADMIN".equalsIgnoreCase(r) || "SUPER_ADMIN".equalsIgnoreCase(r));
        if (isAdmin) {
            return permissionRepository.findAll().stream()
                    .map(Permission::getCode)
                    .collect(Collectors.toSet());
        }

        List<String> roleNames = user.getRoles();
        List<String> dbPermCodes = permissionRepository.findPermissionCodesByRoleNames(roleNames);
        Set<String> effective = new HashSet<>(dbPermCodes);

        // Also add base/static permissions
        for (Permission p : permissionRepository.findAll()) {
            if (securityEvaluator.hasPermission(userId, p.getCode(), null, null)) {
                effective.add(p.getCode());
            }
        }

        return effective;
    }

    public boolean isAdmin(UUID userId) {
        if (userId == null) return false;
        return adminUserRepository.findById(userId)
                .map(u -> u.getRoles().stream().anyMatch(r -> "ADMIN".equalsIgnoreCase(r) || "SUPER_ADMIN".equalsIgnoreCase(r)))
                .orElse(false);
    }

    public boolean isSuperAdmin(UUID userId) {
        return isAdmin(userId);
    }

    /**
     * Computes the distance (hops) from a role to the root ADMIN role in the role tree.
     * Distance 0: ADMIN
     * VOLUNTEER (standalone, lowest role): Integer.MAX_VALUE
     * Returns Integer.MAX_VALUE - 1 if role is unreachable from ADMIN.
     */
    public int getDistanceToAdmin(String roleName, List<Role> allRoles) {
        if (roleName == null || roleName.isBlank()) return Integer.MAX_VALUE;
        String cleanName = roleName.trim().toUpperCase();
        if ("ADMIN".equals(cleanName) || "SUPER_ADMIN".equals(cleanName)) return 0;
        if ("VOLUNTEER".equals(cleanName)) return Integer.MAX_VALUE;

        Map<UUID, Role> roleById = allRoles.stream().collect(Collectors.toMap(Role::getId, r -> r, (a, b) -> a));
        Map<String, Role> roleByName = allRoles.stream().collect(Collectors.toMap(r -> r.getName().toUpperCase(), r -> r, (a, b) -> a));

        Role current = roleByName.get(cleanName);
        if (current == null) return Integer.MAX_VALUE - 1;

        int distance = 0;
        Set<UUID> visited = new HashSet<>();

        while (current != null && !visited.contains(current.getId())) {
            visited.add(current.getId());
            if ("ADMIN".equalsIgnoreCase(current.getName())) {
                return distance;
            }
            if (current.getParentRoleId() == null) {
                break;
            }
            current = roleById.get(current.getParentRoleId());
            distance++;
        }

        // If reached ADMIN root
        if (current != null && "ADMIN".equalsIgnoreCase(current.getName())) {
            return distance;
        }

        return Integer.MAX_VALUE - 1;
    }

    /**
     * Determines the primary role as the highest role in the role hierarchy (least distance to ADMIN root).
     * VOLUNTEER is always lowest priority.
     */
    public String determinePrimaryRole(List<?> roles) {
        if (roles == null || roles.isEmpty()) return "VOLUNTEER";

        List<String> strRoles = roles.stream()
                .map(r -> r instanceof AdminRole ar ? ar.name() : String.valueOf(r).trim())
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();

        if (strRoles.isEmpty()) return "VOLUNTEER";
        if (strRoles.stream().anyMatch(r -> "ADMIN".equalsIgnoreCase(r) || "SUPER_ADMIN".equalsIgnoreCase(r))) {
            return "ADMIN";
        }

        List<Role> allRoles = roleRepository.findAll();
        String bestRole = strRoles.get(0);
        int minDistance = Integer.MAX_VALUE;

        for (String r : strRoles) {
            int dist = getDistanceToAdmin(r, allRoles);
            if (dist < minDistance) {
                minDistance = dist;
                bestRole = r;
            }
        }

        return bestRole;
    }

    /**
     * Retrieves all role IDs owned by an actor.
     */
    public Set<UUID> getActorRoleIds(UUID actorId) {
        if (actorId == null) return Collections.emptySet();
        AdminUser user = adminUserRepository.findById(actorId).orElse(null);
        if (user == null || user.getRoles() == null) return Collections.emptySet();

        List<String> roleNames = user.getRoles();
        List<Role> allRoles = roleRepository.findAll();
        return allRoles.stream()
                .filter(r -> roleNames.stream().anyMatch(rn -> rn.equalsIgnoreCase(r.getName())))
                .map(Role::getId)
                .collect(Collectors.toSet());
    }

    /**
     * Checks if targetRoleId is a descendant (child, grandchild, etc.) of any of the actor's held roles.
     * SUPER_ADMIN / ADMIN is at the root and thus can manage all descendants in the tree.
     */
    public boolean isDescendantOf(UUID targetRoleId, Set<UUID> actorRoleIds, List<Role> allRoles) {
        if (targetRoleId == null || actorRoleIds == null || actorRoleIds.isEmpty()) return false;
        Map<UUID, Role> roleMap = allRoles.stream().collect(Collectors.toMap(Role::getId, r -> r, (a, b) -> a));

        UUID current = targetRoleId;
        Set<UUID> visited = new HashSet<>();

        while (current != null && !visited.contains(current)) {
            visited.add(current);
            Role role = roleMap.get(current);
            if (role == null || role.getParentRoleId() == null) {
                break;
            }
            UUID parentId = role.getParentRoleId();
            if (actorRoleIds.contains(parentId)) {
                return true;
            }
            current = parentId;
        }

        return false;
    }

    /**
     * Collects all recursive descendant role IDs (children, grandchildren, etc.) of a given role.
     */
    public List<UUID> getAllDescendantRoleIds(UUID parentRoleId, List<Role> allRoles) {
        List<UUID> descendants = new ArrayList<>();
        Queue<UUID> queue = new LinkedList<>();
        queue.add(parentRoleId);

        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            for (Role r : allRoles) {
                if (current.equals(r.getParentRoleId()) && !descendants.contains(r.getId())) {
                    descendants.add(r.getId());
                    queue.add(r.getId());
                }
            }
        }

        return descendants;
    }

    @Transactional
    public RoleWithPermissionsDTO createCustomRole(CreateCustomRoleDTO dto, UUID creatorId) {
        if (dto.getName() == null || dto.getName().trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numele rolului este obligatoriu.");
        }

        String rawName = dto.getName().trim();
        String roleName = rawName.toUpperCase().replace(" ", "_");

        if (roleRepository.findByName(roleName).isPresent() || roleRepository.findByName(rawName).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un rol cu acest nume există deja.");
        }

        List<Role> allRoles = roleRepository.findAll();
        UUID adminRoleId = allRoles.stream()
                .filter(r -> "ADMIN".equalsIgnoreCase(r.getName()))
                .map(Role::getId)
                .findFirst()
                .orElse(null);

        UUID resolvedParentId = dto.getParentRoleId();

        if (creatorId != null && !isSuperAdmin(creatorId)) {
            Set<UUID> creatorRoleIds = getActorRoleIds(creatorId);
            if (resolvedParentId != null) {
                // Must be creator's own role OR a descendant of creator's role
                boolean isValidParent = creatorRoleIds.contains(resolvedParentId)
                        || isDescendantOf(resolvedParentId, creatorRoleIds, allRoles);
                if (!isValidParent) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu poți crea un rol sub un părinte din afara ierarhiei tale.");
                }
            } else {
                // Default parent to creator's first role
                resolvedParentId = creatorRoleIds.stream().findFirst().orElse(adminRoleId);
            }

            // Mathematical Subset Rule 1: P_new_role ⊆ P_creator
            Set<String> creatorPerms = getEffectivePermissionsForUser(creatorId);
            List<String> requestedCodes = dto.getPermissionCodes() != null ? dto.getPermissionCodes() : Collections.emptyList();
            for (String code : requestedCodes) {
                if (!creatorPerms.contains(code)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu poți delega o permisiune pe care nu o deții: " + code);
                }
            }
        } else {
            if (resolvedParentId == null) {
                resolvedParentId = adminRoleId;
            }
        }

        Role newRole = new Role();
        newRole.setId(UUID.randomUUID());
        newRole.setName(roleName);
        newRole.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : "");
        newRole.setSystem(false);
        newRole.setCreatedBy(creatorId);
        newRole.setParentRoleId(resolvedParentId);

        roleRepository.save(newRole);

        List<UUID> permIds = new ArrayList<>();
        List<String> permCodes = new ArrayList<>();

        if (dto.getPermissionCodes() != null && !dto.getPermissionCodes().isEmpty()) {
            for (String code : dto.getPermissionCodes()) {
                Optional<Permission> pOpt = permissionRepository.findByCode(code.trim());
                if (pOpt.isPresent()) {
                    permIds.add(pOpt.get().getId());
                    permCodes.add(pOpt.get().getCode());
                }
            }
            permissionRepository.saveRolePermissions(newRole.getId(), permIds);
            securityEvaluator.clearPermissionCache();
        }

        return new RoleWithPermissionsDTO(
                newRole.getId(),
                newRole.getName(),
                newRole.getDescription(),
                newRole.isSystem(),
                newRole.getCreatedBy(),
                newRole.getParentRoleId(),
                permIds,
                permCodes
        );
    }

    @Transactional
    public void updateRolePermissions(UUID roleId, UpdateRolePermissionsDTO dto, UUID actorId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rolul nu a fost găsit."));

        // Safeguard 1: Protected system roles and SUPER_ADMIN cannot be modified
        if (role.isSystem() || "SUPER_ADMIN".equalsIgnoreCase(role.getName()) || "ADMIN".equalsIgnoreCase(role.getName()) || "VOLUNTEER".equalsIgnoreCase(role.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Rolurile de sistem nu pot fi modificate.");
        }

        List<Role> allRoles = roleRepository.findAll();

        // Safeguard 2: You cannot modify permissions of a role you currently possess
        if (actorId != null) {
            AdminUser actor = adminUserRepository.findById(actorId).orElse(null);
            if (actor != null && actor.getRoles() != null) {
                boolean ownsRole = actor.getRoles().stream()
                        .anyMatch(r -> r.equalsIgnoreCase(role.getName()));
                if (ownsRole) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu poți modifica permisiunile unui rol pe care îl deții deja.");
                }
            }
        }

        // Safeguard 3: Hierarchy Tree Rule - Role must be a descendant of one of actor's held roles
        if (actorId != null && !isSuperAdmin(actorId)) {
            Set<UUID> actorRoleIds = getActorRoleIds(actorId);
            boolean isChildOrDescendant = isDescendantOf(roleId, actorRoleIds, allRoles);
            if (!isChildOrDescendant) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu poți modifica un rol care nu se află în subarborele rolurilor tale.");
            }
        }

        // Mathematical Subset Rule: Actor can only assign permissions they hold (unless Super Admin)
        List<UUID> newPermIds = dto.getPermissionIds() != null ? dto.getPermissionIds() : Collections.emptyList();
        if (actorId != null && !isSuperAdmin(actorId)) {
            Set<String> actorPerms = getEffectivePermissionsForUser(actorId);
            for (UUID pId : newPermIds) {
                Permission p = permissionRepository.findById(pId).orElse(null);
                if (p != null && !actorPerms.contains(p.getCode())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu poți delega o permisiune pe care nu o deții: " + p.getCode());
                }
            }
        }

        // Identify revoked permissions to cascade down tree
        List<Permission> existingPerms = permissionRepository.findByRoleId(roleId);
        Set<UUID> existingPermIdSet = existingPerms.stream().map(Permission::getId).collect(Collectors.toSet());
        Set<UUID> newPermIdSet = new HashSet<>(newPermIds);
        List<UUID> removedPermIds = existingPermIdSet.stream()
                .filter(id -> !newPermIdSet.contains(id))
                .toList();

        permissionRepository.saveRolePermissions(roleId, newPermIds);

        // Cascading Revocation: if permissions removed, revoke them from all descendant roles
        if (!removedPermIds.isEmpty()) {
            List<UUID> descendantRoleIds = getAllDescendantRoleIds(roleId, allRoles);
            for (UUID descId : descendantRoleIds) {
                List<Permission> descPerms = permissionRepository.findByRoleId(descId);
                List<UUID> updatedDescPermIds = descPerms.stream()
                        .map(Permission::getId)
                        .filter(id -> !removedPermIds.contains(id))
                        .toList();
                if (updatedDescPermIds.size() != descPerms.size()) {
                    permissionRepository.saveRolePermissions(descId, updatedDescPermIds);
                }
            }
        }

        securityEvaluator.clearPermissionCache();
    }

    @Transactional
    public void deleteCustomRole(UUID roleId, UUID actorId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rolul nu a fost găsit."));

        // Rule 3: Protected system roles cannot be deleted (only ADMIN and VOLUNTEER)
        if (role.isSystem() || "ADMIN".equalsIgnoreCase(role.getName()) || "VOLUNTEER".equalsIgnoreCase(role.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolurile de sistem nu pot fi șterse.");
        }

        // Check if any active user is assigned to this role
        int assignedCount = roleRepository.countUsersAssignedToRole(role.getName());
        if (assignedCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rolul este atribuit la " + assignedCount + " utilizatori. Reatribuiți utilizatorii înainte de ștergere.");
        }

        roleRepository.deleteById(roleId);
        securityEvaluator.clearPermissionCache();
    }

    public void validateRoleAssignmentAuthority(UUID assignerId, List<String> requestedRoleNames) {
        if (assignerId == null || isSuperAdmin(assignerId)) {
            return;
        }

        Set<String> assignerPerms = getEffectivePermissionsForUser(assignerId);

        for (String roleName : requestedRoleNames) {
            List<Permission> rolePerms = permissionRepository.findByRoleName(roleName.trim());
            for (Permission p : rolePerms) {
                if (!assignerPerms.contains(p.getCode())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu poți atribui un rol (" + roleName + ") care conține permisiuni peste nivelul tău de acces: " + p.getCode());
                }
            }
        }
    }
}
