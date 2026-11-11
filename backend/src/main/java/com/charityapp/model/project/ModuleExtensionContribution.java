package com.charityapp.model.project;

public class ModuleExtensionContribution {
    private String targetModuleId;
    private String targetSlot;
    private String componentKey;

    public ModuleExtensionContribution() {}

    public ModuleExtensionContribution(String targetModuleId, String targetSlot, String componentKey) {
        this.targetModuleId = targetModuleId;
        this.targetSlot = targetSlot;
        this.componentKey = componentKey;
    }

    public String getTargetModuleId() { return targetModuleId; }
    public void setTargetModuleId(String targetModuleId) { this.targetModuleId = targetModuleId; }

    public String getTargetSlot() { return targetSlot; }
    public void setTargetSlot(String targetSlot) { this.targetSlot = targetSlot; }

    public String getComponentKey() { return componentKey; }
    public void setComponentKey(String componentKey) { this.componentKey = componentKey; }
}
