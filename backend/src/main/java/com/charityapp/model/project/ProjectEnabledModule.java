package com.charityapp.model.project;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ProjectEnabledModule {
    private UUID id;
    private UUID projectId;
    private String moduleId;
    private boolean isActive;
    private String configJson;
    private OffsetDateTime enabledAt;
    private UUID enabledBy;

    public ProjectEnabledModule() {
        this.isActive = true;
        this.configJson = "{}";
    }

    public ProjectEnabledModule(UUID id, UUID projectId, String moduleId, boolean isActive, String configJson, UUID enabledBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.projectId = projectId;
        this.moduleId = moduleId;
        this.isActive = isActive;
        this.configJson = configJson != null ? configJson : "{}";
        this.enabledBy = enabledBy;
        this.enabledAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }

    public String getModuleId() { return moduleId; }
    public void setModuleId(String moduleId) { this.moduleId = moduleId; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public String getConfigJson() { return configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }

    public OffsetDateTime getEnabledAt() { return enabledAt; }
    public void setEnabledAt(OffsetDateTime enabledAt) { this.enabledAt = enabledAt; }

    public UUID getEnabledBy() { return enabledBy; }
    public void setEnabledBy(UUID enabledBy) { this.enabledBy = enabledBy; }
}
