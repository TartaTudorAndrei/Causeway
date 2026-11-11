package com.charityapp.model.communication;

import java.time.OffsetDateTime;
import java.util.UUID;

public class EmailLog {
    private UUID id;
    private UUID templateId;
    private String recipientEmail;
    private String recipientName;
    private String subject;
    private String dispatchMethod; // API, EML_DOWNLOAD, CLIPBOARD_COPY, HTML_DOWNLOAD
    private String status;         // SENT, FAILED, EXPORTED
    private UUID sentBy;
    private OffsetDateTime sentAt;

    public EmailLog() {
        this.id = UUID.randomUUID();
        this.status = "SENT";
        this.sentAt = OffsetDateTime.now();
    }

    public EmailLog(UUID id, UUID templateId, String recipientEmail, String recipientName,
                    String subject, String dispatchMethod, String status, UUID sentBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.templateId = templateId;
        this.recipientEmail = recipientEmail;
        this.recipientName = recipientName;
        this.subject = subject;
        this.dispatchMethod = dispatchMethod;
        this.status = status != null ? status : "SENT";
        this.sentBy = sentBy;
        this.sentAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

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

    public String getDispatchMethod() {
        return dispatchMethod;
    }

    public void setDispatchMethod(String dispatchMethod) {
        this.dispatchMethod = dispatchMethod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getSentBy() {
        return sentBy;
    }

    public void setSentBy(UUID sentBy) {
        this.sentBy = sentBy;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(OffsetDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
