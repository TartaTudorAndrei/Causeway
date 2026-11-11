package com.charityapp.dto.notification;

import java.util.List;

public class TriggerMetadataDTO {

    public static class PlaceholderInfo {
        private String key;
        private String description;

        public PlaceholderInfo() {}

        public PlaceholderInfo(String key, String description) {
            this.key = key;
            this.description = description;
        }

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    private String ruleType;
    private String category;
    private String name;
    private String description;
    private List<PlaceholderInfo> placeholders;
    private boolean supportsTiming;
    private boolean supportsMinCapacity;
    private boolean supportsSourceGroup;
    private String defaultRecipientType;
    private List<String> allowedRecipientTypes;
    private List<String> defaultTemplates;
    private Integer defaultTimingMinutes;
    private Integer defaultMinCapacity;
    private Integer defaultCooldownMinutes;

    public TriggerMetadataDTO() {}

    public TriggerMetadataDTO(String ruleType, String category, String name, String description,
                              List<PlaceholderInfo> placeholders, boolean supportsTiming, boolean supportsMinCapacity,
                              String defaultRecipientType, List<String> defaultTemplates,
                              Integer defaultTimingMinutes, Integer defaultMinCapacity, Integer defaultCooldownMinutes) {
        this(ruleType, category, name, description, placeholders, supportsTiming, supportsMinCapacity,
                defaultRecipientType, List.of(), defaultTemplates, defaultTimingMinutes, defaultMinCapacity, defaultCooldownMinutes);
    }

    public TriggerMetadataDTO(String ruleType, String category, String name, String description,
                              List<PlaceholderInfo> placeholders, boolean supportsTiming, boolean supportsMinCapacity,
                              String defaultRecipientType, List<String> allowedRecipientTypes, List<String> defaultTemplates,
                              Integer defaultTimingMinutes, Integer defaultMinCapacity, Integer defaultCooldownMinutes) {
        this(ruleType, category, name, description, placeholders, supportsTiming, supportsMinCapacity, false,
                defaultRecipientType, allowedRecipientTypes, defaultTemplates, defaultTimingMinutes, defaultMinCapacity, defaultCooldownMinutes);
    }

    public TriggerMetadataDTO(String ruleType, String category, String name, String description,
                              List<PlaceholderInfo> placeholders, boolean supportsTiming, boolean supportsMinCapacity,
                              boolean supportsSourceGroup,
                              String defaultRecipientType, List<String> allowedRecipientTypes, List<String> defaultTemplates,
                              Integer defaultTimingMinutes, Integer defaultMinCapacity, Integer defaultCooldownMinutes) {
        this.ruleType = ruleType;
        this.category = category;
        this.name = name;
        this.description = description;
        this.placeholders = placeholders;
        this.supportsTiming = supportsTiming;
        this.supportsMinCapacity = supportsMinCapacity;
        this.supportsSourceGroup = supportsSourceGroup;
        this.defaultRecipientType = defaultRecipientType;
        this.allowedRecipientTypes = allowedRecipientTypes;
        this.defaultTemplates = defaultTemplates;
        this.defaultTimingMinutes = defaultTimingMinutes;
        this.defaultMinCapacity = defaultMinCapacity;
        this.defaultCooldownMinutes = defaultCooldownMinutes;
    }

    public String getRuleType() { return ruleType; }
    public void setRuleType(String ruleType) { this.ruleType = ruleType; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<PlaceholderInfo> getPlaceholders() { return placeholders; }
    public void setPlaceholders(List<PlaceholderInfo> placeholders) { this.placeholders = placeholders; }

    public boolean isSupportsTiming() { return supportsTiming; }
    public void setSupportsTiming(boolean supportsTiming) { this.supportsTiming = supportsTiming; }

    public boolean isSupportsMinCapacity() { return supportsMinCapacity; }
    public void setSupportsMinCapacity(boolean supportsMinCapacity) { this.supportsMinCapacity = supportsMinCapacity; }

    public boolean isSupportsSourceGroup() { return supportsSourceGroup; }
    public void setSupportsSourceGroup(boolean supportsSourceGroup) { this.supportsSourceGroup = supportsSourceGroup; }

    public String getDefaultRecipientType() { return defaultRecipientType; }
    public void setDefaultRecipientType(String defaultRecipientType) { this.defaultRecipientType = defaultRecipientType; }

    public List<String> getAllowedRecipientTypes() { return allowedRecipientTypes; }
    public void setAllowedRecipientTypes(List<String> allowedRecipientTypes) { this.allowedRecipientTypes = allowedRecipientTypes; }

    public List<String> getDefaultTemplates() { return defaultTemplates; }
    public void setDefaultTemplates(List<String> defaultTemplates) { this.defaultTemplates = defaultTemplates; }

    public Integer getDefaultTimingMinutes() { return defaultTimingMinutes; }
    public void setDefaultTimingMinutes(Integer defaultTimingMinutes) { this.defaultTimingMinutes = defaultTimingMinutes; }

    public Integer getDefaultMinCapacity() { return defaultMinCapacity; }
    public void setDefaultMinCapacity(Integer defaultMinCapacity) { this.defaultMinCapacity = defaultMinCapacity; }

    public Integer getDefaultCooldownMinutes() { return defaultCooldownMinutes; }
    public void setDefaultCooldownMinutes(Integer defaultCooldownMinutes) { this.defaultCooldownMinutes = defaultCooldownMinutes; }
}
