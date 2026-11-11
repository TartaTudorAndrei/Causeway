package com.charityapp.model.project;

public class ModuleNavigationTab {
    private String id;
    private String labelKey;
    private String routePath;
    private int order;
    private String requiredPermission;

    public ModuleNavigationTab() {}

    public ModuleNavigationTab(String id, String labelKey, String routePath, int order, String requiredPermission) {
        this.id = id;
        this.labelKey = labelKey;
        this.routePath = routePath;
        this.order = order;
        this.requiredPermission = requiredPermission;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLabelKey() { return labelKey; }
    public void setLabelKey(String labelKey) { this.labelKey = labelKey; }

    public String getRoutePath() { return routePath; }
    public void setRoutePath(String routePath) { this.routePath = routePath; }

    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }

    public String getRequiredPermission() { return requiredPermission; }
    public void setRequiredPermission(String requiredPermission) { this.requiredPermission = requiredPermission; }
}
