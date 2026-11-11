package com.charityapp.model.hr;

import java.time.LocalDateTime;
import java.util.UUID;

public class HrStandRole {
    private UUID id;
    private String name;
    private String description;
    private boolean isSystem;
    private String category; // 'LEADERSHIP', 'FINANCE', 'LOGISTICS', 'GENERAL'
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public HrStandRole() {}

    public HrStandRole(UUID id, String name, String description, boolean isSystem, String category) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.description = description;
        this.isSystem = isSystem;
        this.category = category != null ? category : "GENERAL";
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

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
