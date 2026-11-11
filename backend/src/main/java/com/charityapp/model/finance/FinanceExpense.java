package com.charityapp.model.finance;
import com.charityapp.model.auth.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class FinanceExpense {
    private UUID id;
    private String name;
    private LocalDate transactionDate;
    private BigDecimal amount;
    private String currency;
    private String category;
    private String description;
    private String paymentMethod;
    private String campaignDepartment;
    private String receiptAttachment;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FinanceExpense() {}

    public FinanceExpense(String name, LocalDate transactionDate, BigDecimal amount, String currency, String category,
                          String description, String paymentMethod, String campaignDepartment,
                          String receiptAttachment, UUID createdBy) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.transactionDate = transactionDate;
        this.amount = amount;
        this.currency = currency != null ? currency : "RON";
        this.category = category;
        this.description = description;
        this.paymentMethod = paymentMethod;
        this.campaignDepartment = campaignDepartment;
        this.receiptAttachment = receiptAttachment;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getCampaignDepartment() { return campaignDepartment; }
    public void setCampaignDepartment(String campaignDepartment) { this.campaignDepartment = campaignDepartment; }

    public String getReceiptAttachment() { return receiptAttachment; }
    public void setReceiptAttachment(String receiptAttachment) { this.receiptAttachment = receiptAttachment; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
