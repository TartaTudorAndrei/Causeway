package com.charityapp.dto.admin;

import java.util.List;

public class UpdateUserRoleDTO {
    private String primaryRole;
    private String role;
    private List<String> roles;
    private List<UserMembershipDTO> memberships;

    public UpdateUserRoleDTO() {}

    public String getPrimaryRole() {
        if (primaryRole != null) return primaryRole;
        if (role != null) return role;
        if (roles != null && !roles.isEmpty()) return roles.get(0);
        return "VOLUNTEER";
    }

    public void setPrimaryRole(String primaryRole) {
        this.primaryRole = primaryRole;
    }

    public String getRole() {
        return getPrimaryRole();
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<String> getRoles() {
        if (roles != null && !roles.isEmpty()) return roles;
        String pRole = getPrimaryRole();
        return List.of(pRole != null ? pRole : "VOLUNTEER");
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public List<UserMembershipDTO> getMemberships() {
        return memberships;
    }

    public void setMemberships(List<UserMembershipDTO> memberships) {
        this.memberships = memberships;
    }

    public static class UserMembershipDTO {
        private String roleName;
        private String scopeType;
        private String scopeId;
        private List<String> permissions;

        public UserMembershipDTO() {}

        public String getRoleName() { return roleName; }
        public void setRoleName(String roleName) { this.roleName = roleName; }

        public String getScopeType() { return scopeType; }
        public void setScopeType(String scopeType) { this.scopeType = scopeType; }

        public String getScopeId() { return scopeId; }
        public void setScopeId(String scopeId) { this.scopeId = scopeId; }

        public List<String> getPermissions() { return permissions; }
        public void setPermissions(List<String> permissions) { this.permissions = permissions; }
    }
}
