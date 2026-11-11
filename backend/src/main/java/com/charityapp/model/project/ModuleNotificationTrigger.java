package com.charityapp.model.project;

import java.util.Collections;
import java.util.Map;

public class ModuleNotificationTrigger {
    private String eventType;
    private String labelKey;
    private Map<String, String> payloadSchema;

    public ModuleNotificationTrigger() {
        this.payloadSchema = Collections.emptyMap();
    }

    public ModuleNotificationTrigger(String eventType, String labelKey, Map<String, String> payloadSchema) {
        this.eventType = eventType;
        this.labelKey = labelKey;
        this.payloadSchema = payloadSchema != null ? payloadSchema : Collections.emptyMap();
    }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getLabelKey() { return labelKey; }
    public void setLabelKey(String labelKey) { this.labelKey = labelKey; }

    public Map<String, String> getPayloadSchema() { return payloadSchema; }
    public void setPayloadSchema(Map<String, String> payloadSchema) { this.payloadSchema = payloadSchema; }
}
