package com.charityapp.dto.project;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public class UpdateProjectModulesRequest {
    private List<String> moduleIds;
    private boolean cascadeDisable;
    private Map<String, String> moduleConfigs;

    public UpdateProjectModulesRequest() {
        this.moduleIds = Collections.emptyList();
        this.moduleConfigs = Collections.emptyMap();
    }

    public List<String> getModuleIds() { return moduleIds; }
    public void setModuleIds(List<String> moduleIds) { this.moduleIds = moduleIds; }

    public boolean isCascadeDisable() { return cascadeDisable; }
    public void setCascadeDisable(boolean cascadeDisable) { this.cascadeDisable = cascadeDisable; }

    public Map<String, String> getModuleConfigs() { return moduleConfigs; }
    public void setModuleConfigs(Map<String, String> moduleConfigs) { this.moduleConfigs = moduleConfigs; }
}
