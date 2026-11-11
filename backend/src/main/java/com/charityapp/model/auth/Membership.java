package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class Membership {
    private UUID id;
    private UUID userId;
    private UUID roleId;
    private ScopeType scopeType;
    private UUID scopeId;
    private LocalDateTime createdAt;

    public Membership() {}

    public Membership(UUID userId, UUID roleId, ScopeType scopeType, UUID scopeId) {
        this.userId = userId;
        this.roleId = roleId;
        this.scopeType = scopeType;
        this.scopeId = scopeId;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getRoleId() { return roleId; }
    public void setRoleId(UUID roleId) { this.roleId = roleId; }

    public ScopeType getScopeType() { return scopeType; }
    public void setScopeType(ScopeType scopeType) { this.scopeType = scopeType; }

    public UUID getScopeId() { return scopeId; }
    public void setScopeId(UUID scopeId) { this.scopeId = scopeId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
