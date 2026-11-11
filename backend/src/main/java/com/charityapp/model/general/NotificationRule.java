package com.charityapp.model.general;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notification_rules", schema = "general")
public class NotificationRule {

    @Id
    private UUID id;

    @Column(name = "channel", nullable = false, length = 32)
    private String channel = "WHATSAPP";

    @Column(name = "rule_type", nullable = false, length = 64)
    private String ruleType;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, length = 32)
    private String category;

    @Column(name = "is_active", nullable = false)
    private boolean active = false;

    @Column(name = "trigger_timing_minutes", nullable = false)
    private int triggerTimingMinutes = 120;

    @Column(name = "min_capacity_threshold")
    private Integer minCapacityThreshold = 1;

    @Column(name = "target_recipient_type", nullable = false, length = 32)
    private String targetRecipientType = "COORDINATOR_GROUP";

    @Column(name = "custom_recipient_jid", length = 128)
    private String customRecipientJid;

    @Column(name = "source_group_jid", length = 128)
    private String sourceGroupJid;

    @Column(name = "title_template", columnDefinition = "TEXT")
    private String titleTemplate;

    @Column(name = "action_url", length = 255)
    private String actionUrl;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String templates;

    @Column(name = "cooldown_minutes", nullable = false)
    private int cooldownMinutes = 60;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public NotificationRule() {
        this.id = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public NotificationRule(UUID id, String channel, String ruleType, String name, String category, boolean active,
                            int triggerTimingMinutes, Integer minCapacityThreshold, String targetRecipientType,
                            String customRecipientJid, String titleTemplate, String actionUrl,
                            String templates, int cooldownMinutes) {
        this.id = id != null ? id : UUID.randomUUID();
        this.channel = channel != null ? channel : "WHATSAPP";
        this.ruleType = ruleType;
        this.name = name;
        this.category = category;
        this.active = active;
        this.triggerTimingMinutes = triggerTimingMinutes;
        this.minCapacityThreshold = minCapacityThreshold;
        this.targetRecipientType = targetRecipientType;
        this.customRecipientJid = customRecipientJid;
        this.titleTemplate = titleTemplate;
        this.actionUrl = actionUrl;
        this.templates = templates;
        this.cooldownMinutes = cooldownMinutes;
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.id == null) this.id = UUID.randomUUID();
        if (this.channel == null) this.channel = "WHATSAPP";
        if (this.createdAt == null) this.createdAt = OffsetDateTime.now();
        if (this.updatedAt == null) this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
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
    public void setCustomRecipientJid(String customRecipientJid) { this.customRecipientJid = customRecipientJid; }

    public String getSourceGroupJid() { return sourceGroupJid; }
    public void setSourceGroupJid(String sourceGroupJid) { this.sourceGroupJid = sourceGroupJid; }

    public String getTitleTemplate() { return titleTemplate; }
    public void setTitleTemplate(String titleTemplate) { this.titleTemplate = titleTemplate; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public String getTemplates() { return templates; }
    public void setTemplates(String templates) { this.templates = templates; }

    public int getCooldownMinutes() { return cooldownMinutes; }
    public void setCooldownMinutes(int cooldownMinutes) { this.cooldownMinutes = cooldownMinutes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
