package com.charityapp.dto.admin;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class CreateCustomRoleDTO {
    @NotBlank(message = "Numele rolului este obligatoriu.")
    private String name;
    private String description;
    private List<String> permissionCodes;
    private java.util.UUID parentRoleId;

    public CreateCustomRoleDTO() {}

    public CreateCustomRoleDTO(String name, String description, List<String> permissionCodes) {
        this(name, description, permissionCodes, null);
    }

    public CreateCustomRoleDTO(String name, String description, List<String> permissionCodes, java.util.UUID parentRoleId) {
        this.name = name;
        this.description = description;
        this.permissionCodes = permissionCodes;
        this.parentRoleId = parentRoleId;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getPermissionCodes() { return permissionCodes; }
    public void setPermissionCodes(List<String> permissionCodes) { this.permissionCodes = permissionCodes; }

    public java.util.UUID getParentRoleId() { return parentRoleId; }
    public void setParentRoleId(java.util.UUID parentRoleId) { this.parentRoleId = parentRoleId; }
}
