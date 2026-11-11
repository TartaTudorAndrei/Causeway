package com.charityapp.model.project;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public class ProjectModuleDescriptor {
    private String id;
    private String nameKey;
    private ModuleCategory category;
    private List<String> dependencies;
    private List<String> conflictsWith;
    private List<ModulePermission> permissions;
    private List<ModuleNotificationTrigger> notificationTriggers;
    private List<ModuleNavigationTab> navigationTabs;
    private List<ModuleExtensionContribution> extensionContributions;
    private Map<String, Object> configSchema;
    private boolean isBridge;

    public ProjectModuleDescriptor() {
        this.dependencies = Collections.emptyList();
        this.conflictsWith = Collections.emptyList();
        this.permissions = Collections.emptyList();
        this.notificationTriggers = Collections.emptyList();
        this.navigationTabs = Collections.emptyList();
        this.extensionContributions = Collections.emptyList();
        this.configSchema = Collections.emptyMap();
    }

    public ProjectModuleDescriptor(String id,
                                   String nameKey,
                                   ModuleCategory category,
                                   List<String> dependencies,
                                   List<String> conflictsWith,
                                   List<ModulePermission> permissions,
                                   List<ModuleNotificationTrigger> notificationTriggers,
                                   List<ModuleNavigationTab> navigationTabs,
                                   List<ModuleExtensionContribution> extensionContributions,
                                   Map<String, Object> configSchema,
                                   boolean isBridge) {
        this.id = id;
        this.nameKey = nameKey;
        this.category = category;
        this.dependencies = dependencies != null ? dependencies : Collections.emptyList();
        this.conflictsWith = conflictsWith != null ? conflictsWith : Collections.emptyList();
        this.permissions = permissions != null ? permissions : Collections.emptyList();
        this.notificationTriggers = notificationTriggers != null ? notificationTriggers : Collections.emptyList();
        this.navigationTabs = navigationTabs != null ? navigationTabs : Collections.emptyList();
        this.extensionContributions = extensionContributions != null ? extensionContributions : Collections.emptyList();
        this.configSchema = configSchema != null ? configSchema : Collections.emptyMap();
        this.isBridge = isBridge;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNameKey() { return nameKey; }
    public void setNameKey(String nameKey) { this.nameKey = nameKey; }

    public ModuleCategory getCategory() { return category; }
    public void setCategory(ModuleCategory category) { this.category = category; }

    public List<String> getDependencies() { return dependencies; }
    public void setDependencies(List<String> dependencies) { this.dependencies = dependencies; }

    public List<String> getConflictsWith() { return conflictsWith; }
    public void setConflictsWith(List<String> conflictsWith) { this.conflictsWith = conflictsWith; }

    public List<ModulePermission> getPermissions() { return permissions; }
    public void setPermissions(List<ModulePermission> permissions) { this.permissions = permissions; }

    public List<ModuleNotificationTrigger> getNotificationTriggers() { return notificationTriggers; }
    public void setNotificationTriggers(List<ModuleNotificationTrigger> notificationTriggers) { this.notificationTriggers = notificationTriggers; }

    public List<ModuleNavigationTab> getNavigationTabs() { return navigationTabs; }
    public void setNavigationTabs(List<ModuleNavigationTab> navigationTabs) { this.navigationTabs = navigationTabs; }

    public List<ModuleExtensionContribution> getExtensionContributions() { return extensionContributions; }
    public void setExtensionContributions(List<ModuleExtensionContribution> extensionContributions) { this.extensionContributions = extensionContributions; }

    public Map<String, Object> getConfigSchema() { return configSchema; }
    public void setConfigSchema(Map<String, Object> configSchema) { this.configSchema = configSchema; }

    public boolean isBridge() { return isBridge; }
    public void setBridge(boolean bridge) { isBridge = bridge; }
}
