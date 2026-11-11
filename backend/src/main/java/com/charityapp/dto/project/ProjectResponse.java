package com.charityapp.dto.project;

import com.charityapp.model.project.ModuleNavigationTab;
import com.charityapp.model.project.Project;
import com.charityapp.model.project.ProjectEnabledModule;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class ProjectResponse {
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
    private String createdByName;
    private List<ProjectEnabledModule> enabledModules;
    private List<ModuleNavigationTab> navigationTabs;

    public ProjectResponse() {
        this.enabledModules = Collections.emptyList();
        this.navigationTabs = Collections.emptyList();
    }

    public static ProjectResponse from(Project p, List<ProjectEnabledModule> modules, List<ModuleNavigationTab> tabs) {
        return from(p, modules, tabs, null);
    }

    public static ProjectResponse from(Project p, List<ProjectEnabledModule> modules, List<ModuleNavigationTab> tabs, String createdByName) {
        ProjectResponse r = new ProjectResponse();
        r.setId(p.getId());
        r.setEntityId(p.getEntityId());
        r.setName(p.getName());
        r.setSlug(p.getSlug());
        r.setDescription(p.getDescription());
        r.setTemplatePreset(p.getTemplatePreset());
        r.setStatus(p.getStatus());
        r.setCreatedAt(p.getCreatedAt());
        r.setUpdatedAt(p.getUpdatedAt());
        r.setCreatedBy(p.getCreatedBy());
        r.setCreatedByName(createdByName);
        r.setEnabledModules(modules != null ? modules : Collections.emptyList());
        r.setNavigationTabs(tabs != null ? tabs : Collections.emptyList());
        return r;
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

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public List<ProjectEnabledModule> getEnabledModules() { return enabledModules; }
    public void setEnabledModules(List<ProjectEnabledModule> enabledModules) { this.enabledModules = enabledModules; }

    public List<ModuleNavigationTab> getNavigationTabs() { return navigationTabs; }
    public void setNavigationTabs(List<ModuleNavigationTab> navigationTabs) { this.navigationTabs = navigationTabs; }
}
