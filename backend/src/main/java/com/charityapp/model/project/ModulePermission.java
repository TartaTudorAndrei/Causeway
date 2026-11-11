package com.charityapp.model.project;

import java.util.Collections;
import java.util.List;

public class ModulePermission {
    private String code;
    private String labelKey;
    private List<String> defaultRoles;

    public ModulePermission() {
        this.defaultRoles = Collections.emptyList();
    }

    public ModulePermission(String code, String labelKey, List<String> defaultRoles) {
        this.code = code;
        this.labelKey = labelKey;
        this.defaultRoles = defaultRoles != null ? defaultRoles : Collections.emptyList();
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLabelKey() { return labelKey; }
    public void setLabelKey(String labelKey) { this.labelKey = labelKey; }

    public List<String> getDefaultRoles() { return defaultRoles; }
    public void setDefaultRoles(List<String> defaultRoles) { this.defaultRoles = defaultRoles; }
}
