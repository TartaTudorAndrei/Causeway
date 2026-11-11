package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class Role {
    private UUID id;
    private String name;
    private String description;
    private boolean isSystem;
    private UUID createdBy;
    private UUID parentRoleId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Role() {}

    public Role(String name) {
        this(name, null, false, null, null);
    }

    public Role(String name, String description, boolean isSystem, UUID createdBy) {
        this(name, description, isSystem, createdBy, null);
    }

    public Role(String name, String description, boolean isSystem, UUID createdBy, UUID parentRoleId) {
        this.name = name;
        this.description = description;
        this.isSystem = isSystem;
        this.createdBy = createdBy;
        this.parentRoleId = parentRoleId;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
