package com.charityapp.dto.legal;

import java.util.Map;
import java.util.UUID;

public class GenerateContractRequest {
    private UUID templateId;
    private String contractNumber;
    private String title;
    private String partyAName;
    private String partyBName;
    private String partyBEmail;
    private Map<String, Object> fieldValues;
    private String customContent; // Optional override
    private String validFrom;
    private String validUntil;
    private String notes;
    private String status; // draft, pending_signature, signed

    public GenerateContractRequest() {}

    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }

    public String getContractNumber() { return contractNumber; }
    public void setContractNumber(String contractNumber) { this.contractNumber = contractNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPartyAName() { return partyAName; }
    public void setPartyAName(String partyAName) { this.partyAName = partyAName; }

    public String getPartyBName() { return partyBName; }
    public void setPartyBName(String partyBName) { this.partyBName = partyBName; }

    public String getPartyBEmail() { return partyBEmail; }
    public void setPartyBEmail(String partyBEmail) { this.partyBEmail = partyBEmail; }

    public Map<String, Object> getFieldValues() { return fieldValues; }
    public void setFieldValues(Map<String, Object> fieldValues) { this.fieldValues = fieldValues; }

    public String getCustomContent() { return customContent; }
    public void setCustomContent(String customContent) { this.customContent = customContent; }

    public String getValidFrom() { return validFrom; }
    public void setValidFrom(String validFrom) { this.validFrom = validFrom; }

    public String getValidUntil() { return validUntil; }
    public void setValidUntil(String validUntil) { this.validUntil = validUntil; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
