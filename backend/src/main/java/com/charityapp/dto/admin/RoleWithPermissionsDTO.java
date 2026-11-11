package com.charityapp.dto.admin;

import java.util.List;
import java.util.UUID;

public class RoleWithPermissionsDTO {
    private UUID id;
    private String name;
    private String description;
    private boolean isSystem;
    private UUID createdBy;
    private UUID parentRoleId;
    private List<UUID> permissionIds;
    private List<String> permissionCodes;

    public RoleWithPermissionsDTO() {}

    public RoleWithPermissionsDTO(UUID id, String name, List<UUID> permissionIds, List<String> permissionCodes) {
        this(id, name, null, false, null, null, permissionIds, permissionCodes);
    }

    public RoleWithPermissionsDTO(UUID id, String name, String description, boolean isSystem, UUID createdBy, List<UUID> permissionIds, List<String> permissionCodes) {
        this(id, name, description, isSystem, createdBy, null, permissionIds, permissionCodes);
    }

    public RoleWithPermissionsDTO(UUID id, String name, String description, boolean isSystem, UUID createdBy, UUID parentRoleId, List<UUID> permissionIds, List<String> permissionCodes) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.isSystem = isSystem;
        this.createdBy = createdBy;
        this.parentRoleId = parentRoleId;
        this.permissionIds = permissionIds;
        this.permissionCodes = permissionCodes;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isSystem() { return isSystem; }
    public void setSystem(boolean system) { isSystem = system; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public UUID getParentRoleId() { return parentRoleId; }
    public void setParentRoleId(UUID parentRoleId) { this.parentRoleId = parentRoleId; }

    public List<UUID> getPermissionIds() { return permissionIds; }
    public void setPermissionIds(List<UUID> permissionIds) { this.permissionIds = permissionIds; }

    public List<String> getPermissionCodes() { return permissionCodes; }
    public void setPermissionCodes(List<String> permissionCodes) { this.permissionCodes = permissionCodes; }
}
