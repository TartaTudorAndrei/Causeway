package com.charityapp.model.finance;
import com.charityapp.model.auth.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class FinanceOtherIncome {
    private UUID id;
    private LocalDate transactionDate;
    private BigDecimal amount;
    private String currency;
    private String sourcePayer;
    private String category; // Bank Transfer, Grant, Merch Offline, Cash Donation, Other
    private String description;
    private String campaign;
    private String referenceDoc;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FinanceOtherIncome() {}

    public FinanceOtherIncome(LocalDate transactionDate, BigDecimal amount, String currency,
                               String sourcePayer, String category, String description,
                               String campaign, String referenceDoc, UUID createdBy) {
        this.id = UUID.randomUUID();
        this.transactionDate = transactionDate;
        this.amount = amount;
        this.currency = currency != null ? currency : "RON";
        this.sourcePayer = sourcePayer;
        this.category = category;
        this.description = description;
        this.campaign = campaign != null ? campaign : "General";
        this.referenceDoc = referenceDoc;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDate getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getSourcePayer() { return sourcePayer; }
    public void setSourcePayer(String sourcePayer) { this.sourcePayer = sourcePayer; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCampaign() { return campaign; }
    public void setCampaign(String campaign) { this.campaign = campaign; }

    public String getReferenceDoc() { return referenceDoc; }
    public void setReferenceDoc(String referenceDoc) { this.referenceDoc = referenceDoc; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
