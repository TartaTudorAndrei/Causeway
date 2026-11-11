package com.charityapp.dto.admin;

import java.util.List;
import java.util.UUID;

public class UpdateRolePermissionsDTO {
    private List<UUID> permissionIds;

    public UpdateRolePermissionsDTO() {}

    public UpdateRolePermissionsDTO(List<UUID> permissionIds) {
        this.permissionIds = permissionIds;
    }

    public List<UUID> getPermissionIds() { return permissionIds; }
    public void setPermissionIds(List<UUID> permissionIds) { this.permissionIds = permissionIds; }
}
