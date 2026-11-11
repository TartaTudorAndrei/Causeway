package com.charityapp.dto.config;

import java.time.LocalDateTime;

public class ConfigItemDTO {
    private String key;
    private String category;
    private String value;
    private String dataType;
    private boolean isSecret;
    private boolean isConfigured;
    private boolean requiresRestart;
    private String descriptionRo;
    private String descriptionEn;
    private LocalDateTime updatedAt;

    public ConfigItemDTO() {}

    public ConfigItemDTO(String key, String category, String value, String dataType,
                         boolean isSecret, boolean isConfigured, boolean requiresRestart,
                         String descriptionRo, String descriptionEn, LocalDateTime updatedAt) {
        this.key = key;
        this.category = category;
        this.value = value;
        this.dataType = dataType;
        this.isSecret = isSecret;
        this.isConfigured = isConfigured;
        this.requiresRestart = requiresRestart;
        this.descriptionRo = descriptionRo;
        this.descriptionEn = descriptionEn;
        this.updatedAt = updatedAt;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public boolean isSecret() { return isSecret; }
    public void setSecret(boolean secret) { isSecret = secret; }

    public boolean isConfigured() { return isConfigured; }
    public void setConfigured(boolean configured) { isConfigured = configured; }

    public boolean isRequiresRestart() { return requiresRestart; }
    public void setRequiresRestart(boolean requiresRestart) { this.requiresRestart = requiresRestart; }

    public String getDescriptionRo() { return descriptionRo; }
    public void setDescriptionRo(String descriptionRo) { this.descriptionRo = descriptionRo; }

    public String getDescriptionEn() { return descriptionEn; }
    public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
