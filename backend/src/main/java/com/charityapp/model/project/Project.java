package com.charityapp.model.project;

import java.time.OffsetDateTime;
import java.util.UUID;

public class Project {
    private UUID id;
    private UUID entityId;
    private String name;
    private String slug;
    private String description;
    private String templatePreset;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private UUID createdBy;

    public Project() {
        this.status = "ACTIVE";
    }

    public Project(UUID id, UUID entityId, String name, String slug, String description, String templatePreset, String status, UUID createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.entityId = entityId;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.templatePreset = templatePreset;
        this.status = status != null ? status : "ACTIVE";
        this.createdBy = createdBy;
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEntityId() { return entityId; }
    public void setEntityId(UUID entityId) { this.entityId = entityId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTemplatePreset() { return templatePreset; }
    public void setTemplatePreset(String templatePreset) { this.templatePreset = templatePreset; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
}
