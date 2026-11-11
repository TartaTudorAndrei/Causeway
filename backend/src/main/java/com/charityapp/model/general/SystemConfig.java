package com.charityapp.model.general;

import java.time.LocalDateTime;
import java.util.UUID;

public class SystemConfig {
    private String configKey;
    private String category;
    private String configValue;
    private String encryptedValue;
    private String dataType = "STRING";
    private boolean isSecret = false;
    private boolean requiresRestart = false;
    private String descriptionRo;
    private String descriptionEn;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID updatedBy;

    public SystemConfig() {}

    public SystemConfig(String configKey, String category, String configValue, String dataType,
                        boolean isSecret, boolean requiresRestart, String descriptionRo, String descriptionEn) {
        this.configKey = configKey;
        this.category = category;
        this.configValue = configValue;
        this.dataType = dataType != null ? dataType : "STRING";
        this.isSecret = isSecret;
        this.requiresRestart = requiresRestart;
        this.descriptionRo = descriptionRo;
        this.descriptionEn = descriptionEn;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public String getConfigKey() { return configKey; }
    public void setConfigKey(String configKey) { this.configKey = configKey; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getConfigValue() { return configValue; }
    public void setConfigValue(String configValue) { this.configValue = configValue; }

    public String getEncryptedValue() { return encryptedValue; }
    public void setEncryptedValue(String encryptedValue) { this.encryptedValue = encryptedValue; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public boolean isSecret() { return isSecret; }
    public void setSecret(boolean secret) { isSecret = secret; }

    public boolean isRequiresRestart() { return requiresRestart; }
    public void setRequiresRestart(boolean requiresRestart) { this.requiresRestart = requiresRestart; }

    public String getDescriptionRo() { return descriptionRo; }
    public void setDescriptionRo(String descriptionRo) { this.descriptionRo = descriptionRo; }

    public String getDescriptionEn() { return descriptionEn; }
    public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public UUID getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(UUID updatedBy) { this.updatedBy = updatedBy; }
}
