package com.charityapp.dto.finance;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ScannedExpenseDto {
    private String name;
    private LocalDate transactionDate;
    private BigDecimal amount;
    private String currency;
    private String category;
    private String description;
    private String paymentMethod;
    private String merchantName;
    private String rawNotes;
    private String receiptUrl;
    private String receiptAttachment;

    public ScannedExpenseDto() {}

    public ScannedExpenseDto(String name, LocalDate transactionDate, BigDecimal amount, String currency, String category,
                             String description, String paymentMethod, String merchantName, String rawNotes) {
        this.name = name;
        this.transactionDate = transactionDate;
        this.amount = amount;
        this.currency = currency;
        this.category = category;
        this.description = description;
        this.paymentMethod = paymentMethod;
        this.merchantName = merchantName;
        this.rawNotes = rawNotes;
    }

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

    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }

    public String getRawNotes() { return rawNotes; }
    public void setRawNotes(String rawNotes) { this.rawNotes = rawNotes; }

    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }

    public String getReceiptAttachment() { return receiptAttachment; }
    public void setReceiptAttachment(String receiptAttachment) { this.receiptAttachment = receiptAttachment; }
}
