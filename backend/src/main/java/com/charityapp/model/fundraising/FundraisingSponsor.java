package com.charityapp.model.fundraising;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class FundraisingSponsor {
    private UUID id;
    private int sortIndex;
    private String companyName;
    private String companyProfile;
    private String contactInfo;
    private String responsiblePerson;
    private String status;
    private LocalDate lastContactDate;
    private String contractUrl;
    private String notes;
    private String sponsorshipType;
    private String receivedType;
    private String receivedValue;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FundraisingSponsor() {
        this.id = UUID.randomUUID();
        this.sortIndex = 1;
        this.status = "PENDING";
        this.receivedType = "MONEY";
        this.currency = "RON";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public FundraisingSponsor(UUID id, int sortIndex, String companyName, String companyProfile,
                              String contactInfo, String responsiblePerson, String status,
                              LocalDate lastContactDate, String contractUrl, String notes,
                              String sponsorshipType, String receivedType, String receivedValue,
                              String currency) {
        this.id = id != null ? id : UUID.randomUUID();
        this.sortIndex = sortIndex;
        this.companyName = companyName;
        this.companyProfile = companyProfile;
        this.contactInfo = contactInfo;
        this.responsiblePerson = responsiblePerson;
        this.status = status != null ? status : "PENDING";
        this.lastContactDate = lastContactDate;
        this.contractUrl = contractUrl;
        this.notes = notes;
        this.sponsorshipType = sponsorshipType;
        this.receivedType = receivedType != null ? receivedType : "MONEY";
        this.receivedValue = receivedValue;
        this.currency = currency != null ? currency : "RON";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public int getSortIndex() { return sortIndex; }
    public void setSortIndex(int sortIndex) { this.sortIndex = sortIndex; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getCompanyProfile() { return companyProfile; }
    public void setCompanyProfile(String companyProfile) { this.companyProfile = companyProfile; }

    public String getContactInfo() { return contactInfo; }
    public void setContactInfo(String contactInfo) { this.contactInfo = contactInfo; }

    public String getResponsiblePerson() { return responsiblePerson; }
    public void setResponsiblePerson(String responsiblePerson) { this.responsiblePerson = responsiblePerson; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getLastContactDate() { return lastContactDate; }
    public void setLastContactDate(LocalDate lastContactDate) { this.lastContactDate = lastContactDate; }

    public String getContractUrl() { return contractUrl; }
    public void setContractUrl(String contractUrl) { this.contractUrl = contractUrl; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getSponsorshipType() { return sponsorshipType; }
    public void setSponsorshipType(String sponsorshipType) { this.sponsorshipType = sponsorshipType; }

    public String getReceivedType() { return receivedType; }
    public void setReceivedType(String receivedType) { this.receivedType = receivedType; }

    public String getReceivedValue() { return receivedValue; }
    public void setReceivedValue(String receivedValue) { this.receivedValue = receivedValue; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
