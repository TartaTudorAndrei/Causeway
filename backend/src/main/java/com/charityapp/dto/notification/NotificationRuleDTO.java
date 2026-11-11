package com.charityapp.dto.notification;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class NotificationRuleDTO {
    private UUID id;
    private String channel;
    private String ruleType;
    private String name;
    private String category;
    private boolean active;
    private int triggerTimingMinutes;
    private Integer minCapacityThreshold;
    private String targetRecipientType;
    private String customRecipientJid;
    private String customRecipient;
    private String sourceGroupJid;
    private String titleTemplate;
    private String actionUrl;
    private List<String> templates;
    private int cooldownMinutes;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public NotificationRuleDTO() {}

    public NotificationRuleDTO(UUID id, String channel, String ruleType, String name, String category, boolean active,
                               int triggerTimingMinutes, Integer minCapacityThreshold, String targetRecipientType,
                               String customRecipientJid, String customRecipient, String titleTemplate,
                               String actionUrl, List<String> templates, int cooldownMinutes,
                               OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.channel = channel;
        this.ruleType = ruleType;
        this.name = name;
        this.category = category;
        this.active = active;
        this.triggerTimingMinutes = triggerTimingMinutes;
        this.minCapacityThreshold = minCapacityThreshold;
        this.targetRecipientType = targetRecipientType;
        this.customRecipientJid = customRecipientJid;
        this.customRecipient = customRecipient != null ? customRecipient : customRecipientJid;
        this.titleTemplate = titleTemplate;
        this.actionUrl = actionUrl;
        this.templates = templates;
        this.cooldownMinutes = cooldownMinutes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getRuleType() { return ruleType; }
    public void setRuleType(String ruleType) { this.ruleType = ruleType; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getTriggerTimingMinutes() { return triggerTimingMinutes; }
    public void setTriggerTimingMinutes(int triggerTimingMinutes) { this.triggerTimingMinutes = triggerTimingMinutes; }

    public Integer getMinCapacityThreshold() { return minCapacityThreshold; }
    public void setMinCapacityThreshold(Integer minCapacityThreshold) { this.minCapacityThreshold = minCapacityThreshold; }

    public String getTargetRecipientType() { return targetRecipientType; }
    public void setTargetRecipientType(String targetRecipientType) { this.targetRecipientType = targetRecipientType; }

    public String getCustomRecipientJid() { return customRecipientJid; }
    public void setCustomRecipientJid(String customRecipientJid) {
        this.customRecipientJid = customRecipientJid;
        if (this.customRecipient == null) {
            this.customRecipient = customRecipientJid;
        }
    }

    public String getCustomRecipient() { return customRecipient != null ? customRecipient : customRecipientJid; }
    public void setCustomRecipient(String customRecipient) {
        this.customRecipient = customRecipient;
        if (this.customRecipientJid == null) {
            this.customRecipientJid = customRecipient;
        }
    }

    public String getSourceGroupJid() { return sourceGroupJid; }
    public void setSourceGroupJid(String sourceGroupJid) { this.sourceGroupJid = sourceGroupJid; }

    public String getTitleTemplate() { return titleTemplate; }
    public void setTitleTemplate(String titleTemplate) { this.titleTemplate = titleTemplate; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public List<String> getTemplates() { return templates; }
    public void setTemplates(List<String> templates) { this.templates = templates; }

    public int getCooldownMinutes() { return cooldownMinutes; }
    public void setCooldownMinutes(int cooldownMinutes) { this.cooldownMinutes = cooldownMinutes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
