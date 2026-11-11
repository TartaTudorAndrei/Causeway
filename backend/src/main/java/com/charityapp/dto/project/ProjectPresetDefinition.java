package com.charityapp.dto.project;

import java.util.Collections;
import java.util.List;

public class ProjectPresetDefinition {
    private String key;
    private String nameKey;
    private String descriptionKey;
    private List<String> defaultModuleIds;

    public ProjectPresetDefinition() {
        this.defaultModuleIds = Collections.emptyList();
    }

    public ProjectPresetDefinition(String key, String nameKey, String descriptionKey, List<String> defaultModuleIds) {
        this.key = key;
        this.nameKey = nameKey;
        this.descriptionKey = descriptionKey;
        this.defaultModuleIds = defaultModuleIds != null ? defaultModuleIds : Collections.emptyList();
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getNameKey() { return nameKey; }
    public void setNameKey(String nameKey) { this.nameKey = nameKey; }

    public String getDescriptionKey() { return descriptionKey; }
    public void setDescriptionKey(String descriptionKey) { this.descriptionKey = descriptionKey; }

    public List<String> getDefaultModuleIds() { return defaultModuleIds; }
    public void setDefaultModuleIds(List<String> defaultModuleIds) { this.defaultModuleIds = defaultModuleIds; }
}
