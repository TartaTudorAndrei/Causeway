package com.charityapp.dto.communication;

import java.util.Map;
import java.util.UUID;

public class EmailDispatchRequest {
    private UUID templateId;
    private String recipientEmail;
    private String recipientName;
    private String subject;
    private String htmlContent;
    private Map<String, Object> mergeData;

    public UUID getTemplateId() {
        return templateId;
    }

    public void setTemplateId(UUID templateId) {
        this.templateId = templateId;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getHtmlContent() {
        return htmlContent;
    }

    public void setHtmlContent(String htmlContent) {
        this.htmlContent = htmlContent;
    }

    public Map<String, Object> getMergeData() {
        return mergeData;
    }

    public void setMergeData(Map<String, Object> mergeData) {
        this.mergeData = mergeData;
    }
}
