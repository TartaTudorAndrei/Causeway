package com.charityapp.dto.config;

public class ConfigStatusResponse {
    private boolean uiConfigEnabled;
    private boolean restartRequired;
    private int totalConfigs;

    public ConfigStatusResponse() {}

    public ConfigStatusResponse(boolean uiConfigEnabled, boolean restartRequired, int totalConfigs) {
        this.uiConfigEnabled = uiConfigEnabled;
        this.restartRequired = restartRequired;
        this.totalConfigs = totalConfigs;
    }

    public boolean isUiConfigEnabled() { return uiConfigEnabled; }
    public void setUiConfigEnabled(boolean uiConfigEnabled) { this.uiConfigEnabled = uiConfigEnabled; }

    public boolean isRestartRequired() { return restartRequired; }
    public void setRestartRequired(boolean restartRequired) { this.restartRequired = restartRequired; }

    public int getTotalConfigs() { return totalConfigs; }
    public void setTotalConfigs(int totalConfigs) { this.totalConfigs = totalConfigs; }
}
