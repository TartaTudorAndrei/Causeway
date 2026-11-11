package com.charityapp.dto.project;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class CreateProjectRequest {
    private UUID entityId;
    private String name;
    private String slug;
    private String description;
    private String templatePreset;
    private List<String> customModuleIds;
    private Map<String, String> moduleConfigs;
    private Boolean inheritHubConfig;

    public CreateProjectRequest() {
        this.customModuleIds = Collections.emptyList();
        this.moduleConfigs = Collections.emptyMap();
        this.inheritHubConfig = false;
    }

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

    public List<String> getCustomModuleIds() { return customModuleIds; }
    public void setCustomModuleIds(List<String> customModuleIds) { this.customModuleIds = customModuleIds; }

    public Map<String, String> getModuleConfigs() { return moduleConfigs; }
    public void setModuleConfigs(Map<String, String> moduleConfigs) { this.moduleConfigs = moduleConfigs; }

    public Boolean getInheritHubConfig() { return inheritHubConfig != null ? inheritHubConfig : false; }
    public void setInheritHubConfig(Boolean inheritHubConfig) { this.inheritHubConfig = inheritHubConfig; }
}
