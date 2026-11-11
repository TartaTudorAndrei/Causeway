package com.charityapp.model.finance;
import com.charityapp.model.auth.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Donation {
    private Long id;
    private String paymentTransactionId;
    private String paymentProvider;
    private String donorEmail;
    private BigDecimal amount;
    private String currency;
    private String pickupCode;
    private String status;
    private LocalDateTime createdAt;

    public Donation() {}

    public Donation(String paymentTransactionId, String paymentProvider, String donorEmail, BigDecimal amount,
                    String currency, String pickupCode, String status) {
        this.paymentTransactionId = paymentTransactionId;
        this.paymentProvider = paymentProvider;
        this.donorEmail = donorEmail;
        this.amount = amount;
        this.currency = currency;
        this.pickupCode = pickupCode;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }

    public String getPaymentProvider() { return paymentProvider; }
    public void setPaymentProvider(String paymentProvider) { this.paymentProvider = paymentProvider; }

    public String getDonorEmail() { return donorEmail; }
    public void setDonorEmail(String donorEmail) { this.donorEmail = donorEmail; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPickupCode() { return pickupCode; }
    public void setPickupCode(String pickupCode) { this.pickupCode = pickupCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}