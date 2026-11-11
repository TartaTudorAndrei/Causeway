package com.charityapp.model.finance;
import com.charityapp.model.auth.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class FinanceOnlineDonation {
    private UUID id;
    private String processor; // STRIPE, NETOPIA
    private String transactionId;
    private String donorName;
    private String donorEmail;
    private BigDecimal amount;
    private String currency;
    private BigDecimal processingFee;
    private String campaign;
    private LocalDateTime transactionDate;
    private String status; // COMPLETED, REFUNDED, FAILED
    private LocalDateTime createdAt;

    public FinanceOnlineDonation() {}

    public FinanceOnlineDonation(String processor, String transactionId, String donorName, String donorEmail,
                                 BigDecimal amount, String currency, BigDecimal processingFee, String campaign,
                                 LocalDateTime transactionDate, String status) {
        this.id = UUID.randomUUID();
        this.processor = processor;
        this.transactionId = transactionId;
        this.donorName = donorName;
        this.donorEmail = donorEmail;
        this.amount = amount;
        this.currency = currency != null ? currency : "RON";
        this.processingFee = processingFee != null ? processingFee : BigDecimal.ZERO;
        this.campaign = campaign != null ? campaign : "General";
        this.transactionDate = transactionDate != null ? transactionDate : LocalDateTime.now();
        this.status = status != null ? status : "COMPLETED";
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getProcessor() { return processor; }
    public void setProcessor(String processor) { this.processor = processor; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getDonorName() { return donorName; }
    public void setDonorName(String donorName) { this.donorName = donorName; }

    public String getDonorEmail() { return donorEmail; }
    public void setDonorEmail(String donorEmail) { this.donorEmail = donorEmail; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getProcessingFee() { return processingFee; }
    public void setProcessingFee(BigDecimal processingFee) { this.processingFee = processingFee; }

    public String getCampaign() { return campaign; }
    public void setCampaign(String campaign) { this.campaign = campaign; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
