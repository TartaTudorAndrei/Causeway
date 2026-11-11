package com.charityapp.model.legal;

import java.time.LocalDateTime;
import java.util.UUID;

public class GeneratedContract {
    private UUID id;
    private UUID templateId;
    private String contractNumber;
    private String title;
    private String status; // 'draft', 'pending_signature', 'signed', 'archived'
    private String partyAName;
    private String partyBName;
    private String partyBEmail;
    private String fieldValues; // JSON map of key-values
    private String renderedContent;
    private String pdfData; // base64 data URI or raw base64 of generated PDF
    private String driveFileId;
    private String validFrom;
    private String validUntil;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GeneratedContract() {
        this.id = UUID.randomUUID();
        this.status = "draft";
        this.partyAName = "Organizația Caritabilă Familia";
        this.fieldValues = "{}";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }

    public String getContractNumber() { return contractNumber; }
    public void setContractNumber(String contractNumber) { this.contractNumber = contractNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPartyAName() { return partyAName; }
    public void setPartyAName(String partyAName) { this.partyAName = partyAName; }

    public String getPartyBName() { return partyBName; }
    public void setPartyBName(String partyBName) { this.partyBName = partyBName; }

    public String getPartyBEmail() { return partyBEmail; }
    public void setPartyBEmail(String partyBEmail) { this.partyBEmail = partyBEmail; }

    public String getFieldValues() { return fieldValues; }
    public void setFieldValues(String fieldValues) { this.fieldValues = fieldValues; }

    public String getRenderedContent() { return renderedContent; }
    public void setRenderedContent(String renderedContent) { this.renderedContent = renderedContent; }

    public String getPdfData() { return pdfData; }
    public void setPdfData(String pdfData) { this.pdfData = pdfData; }

    public String getDriveFileId() { return driveFileId; }
    public void setDriveFileId(String driveFileId) { this.driveFileId = driveFileId; }

    public String getValidFrom() { return validFrom; }
    public void setValidFrom(String validFrom) { this.validFrom = validFrom; }

    public String getValidUntil() { return validUntil; }
    public void setValidUntil(String validUntil) { this.validUntil = validUntil; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
