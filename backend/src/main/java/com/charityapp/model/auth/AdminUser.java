package com.charityapp.model.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AdminUser {
    private UUID id;
    private String fullName;
    private String email;
    @JsonIgnore
    private String passwordHash;
    private AdminStatus status;
    private String role = "VOLUNTEER";
    private List<String> roles = new ArrayList<>(List.of("VOLUNTEER"));
    private String phone;
    private String organizationType;
    private String organizationDetails;
    private String notes;
    private LocalDateTime lastLoginAt;
    private boolean twoFactorEnabled = false;
    @JsonIgnore
    private String twoFactorSecret;
    private String twoFactorMethod = "NONE";
    private int tokenVersion = 0;
    private AuthProvider authProvider = AuthProvider.LOCAL;
    private boolean whatsappNotificationsEnabled = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public AdminUser() {}

    public AdminUser(String fullName, String email, String passwordHash, AdminStatus status, AdminRole role) {
        this(fullName, email, passwordHash, status, role != null ? role.name() : "VOLUNTEER");
    }

    public AdminUser(String fullName, String email, String passwordHash, AdminStatus status, String role) {
        this.fullName = fullName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = status;
        setRole(role != null && !role.isBlank() ? role : "VOLUNTEER");
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public AdminUser(String fullName, String email, String passwordHash, AdminStatus status, List<?> roles) {
        this.fullName = fullName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = status;
        if (roles != null && !roles.isEmpty()) {
            List<String> strRoles = roles.stream()
                .map(r -> r instanceof AdminRole ar ? ar.name() : String.valueOf(r).trim())
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
            setRoles(strRoles);
        } else {
            setRoles(List.of("VOLUNTEER"));
        }
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public AdminStatus getStatus() { return status; }
    public void setStatus(AdminStatus status) { this.status = status; }

    public String getRole() { 
        if (role != null && !role.isBlank()) return role;
        if (roles != null && !roles.isEmpty()) return roles.get(0);
        return "VOLUNTEER";
    }

    public void setRole(String role) { 
        this.role = role != null && !role.isBlank() ? role.trim() : "VOLUNTEER";
        if (this.roles == null) {
            this.roles = new ArrayList<>();
        }
        if (!this.roles.contains(this.role)) {
            this.roles.add(0, this.role);
        }
    }

    public void setRole(AdminRole role) {
        setRole(role != null ? role.name() : "VOLUNTEER");
    }

    public List<String> getRoles() {
        if (roles != null && !roles.isEmpty()) {
            return roles;
        }
        if (role != null && !role.isBlank()) {
            return List.of(role);
        }
        return List.of("VOLUNTEER");
    }

    public void setRoles(List<?> roles) {
        if (roles != null && !roles.isEmpty()) {
            this.roles = new ArrayList<>(roles.stream()
                .map(r -> r instanceof AdminRole ar ? ar.name() : String.valueOf(r).trim())
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList());
            this.role = this.roles.get(0);
        } else {
            this.roles = new ArrayList<>();
            if (this.role != null && !this.role.isBlank()) {
                this.roles.add(this.role);
            } else {
                this.role = "VOLUNTEER";
                this.roles.add("VOLUNTEER");
            }
        }
    }

    public boolean hasRole(String r) {
        if (r == null) return false;
        return getRoles().stream().anyMatch(roleItem -> roleItem.equalsIgnoreCase(r.trim()));
    }

    public boolean hasRole(AdminRole r) {
        if (r == null) return false;
        return hasRole(r.name());
    }

    public boolean hasAnyRole(String... queryRoles) {
        if (queryRoles == null || queryRoles.length == 0) return false;
        for (String qr : queryRoles) {
            if (hasRole(qr)) return true;
        }
        return false;
    }

    public boolean hasAnyRole(AdminRole... queryRoles) {
        if (queryRoles == null || queryRoles.length == 0) return false;
        for (AdminRole qr : queryRoles) {
            if (hasRole(qr)) return true;
        }
        return false;
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOrganizationType() { return organizationType; }
    public void setOrganizationType(String organizationType) { this.organizationType = organizationType; }

    public String getOrganizationDetails() { return organizationDetails; }
    public void setOrganizationDetails(String organizationDetails) { this.organizationDetails = organizationDetails; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }

    public String getTwoFactorMethod() { return twoFactorMethod; }
    public void setTwoFactorMethod(String twoFactorMethod) { this.twoFactorMethod = twoFactorMethod; }

    public int getTokenVersion() { return tokenVersion; }
    public void setTokenVersion(int tokenVersion) { this.tokenVersion = tokenVersion; }

    public AuthProvider getAuthProvider() { return authProvider != null ? authProvider : AuthProvider.LOCAL; }
    public void setAuthProvider(AuthProvider authProvider) { this.authProvider = authProvider; }

    public boolean isWhatsappNotificationsEnabled() { return whatsappNotificationsEnabled; }
    public void setWhatsappNotificationsEnabled(boolean whatsappNotificationsEnabled) { this.whatsappNotificationsEnabled = whatsappNotificationsEnabled; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
