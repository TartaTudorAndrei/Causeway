package com.charityapp.model.finance;
import com.charityapp.model.auth.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class FinanceSponsorship {
    private UUID id;
    private String sponsorName;
    private String contactPerson;
    private String contactEmail;
    private String tier; // Platinum, Gold, Silver, Custom
    private BigDecimal agreedAmount;
    private String currency;
    private String paymentStatus; // Contract Signed, Funds Received, Lead Identified, Proposal Sent
    private String campaign;
    private String contractUrl;
    private LocalDate receivedDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FinanceSponsorship() {}

    public FinanceSponsorship(String sponsorName, String contactPerson, String contactEmail,
                              String tier, BigDecimal agreedAmount, String currency,
                              String paymentStatus, String campaign, String contractUrl,
                              LocalDate receivedDate) {
        this.id = UUID.randomUUID();
        this.sponsorName = sponsorName;
        this.contactPerson = contactPerson;
        this.contactEmail = contactEmail;
        this.tier = tier;
        this.agreedAmount = agreedAmount;
        this.currency = currency != null ? currency : "RON";
        this.paymentStatus = paymentStatus;
        this.campaign = campaign != null ? campaign : "General";
        this.contractUrl = contractUrl;
        this.receivedDate = receivedDate;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSponsorName() { return sponsorName; }
    public void setSponsorName(String sponsorName) { this.sponsorName = sponsorName; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }

    public BigDecimal getAgreedAmount() { return agreedAmount; }
    public void setAgreedAmount(BigDecimal agreedAmount) { this.agreedAmount = agreedAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getCampaign() { return campaign; }
    public void setCampaign(String campaign) { this.campaign = campaign; }

    public String getContractUrl() { return contractUrl; }
    public void setContractUrl(String contractUrl) { this.contractUrl = contractUrl; }

    public LocalDate getReceivedDate() { return receivedDate; }
    public void setReceivedDate(LocalDate receivedDate) { this.receivedDate = receivedDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
