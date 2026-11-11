package com.charityapp.model.finance;
import com.charityapp.model.auth.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public class FinanceStand {
    private UUID id;
    private String standLocation;
    private LocalDate eventDate;
    private String shiftName;
    private UUID financeResponsibleId;
    private String financeResponsibleName;
    private BigDecimal cashCollected;
    private BigDecimal posCardCollected;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private BigDecimal discrepancyAmount;
    private String discrepancyNotes;
    private String status; // SUBMITTED, VERIFIED, AUDITED
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FinanceStand() {}

    public FinanceStand(String standLocation, LocalDate eventDate, String shiftName,
                        UUID financeResponsibleId, String financeResponsibleName,
                        BigDecimal cashCollected, BigDecimal posCardCollected,
                        BigDecimal openingBalance, BigDecimal closingBalance,
                        BigDecimal discrepancyAmount, String discrepancyNotes, String status) {
        this.id = UUID.randomUUID();
        this.standLocation = standLocation;
        this.eventDate = eventDate;
        this.shiftName = shiftName;
        this.financeResponsibleId = financeResponsibleId;
        this.financeResponsibleName = financeResponsibleName;
        this.cashCollected = cashCollected != null ? cashCollected : BigDecimal.ZERO;
        this.posCardCollected = posCardCollected != null ? posCardCollected : BigDecimal.ZERO;
        this.openingBalance = openingBalance != null ? openingBalance : BigDecimal.ZERO;
        this.closingBalance = closingBalance != null ? closingBalance : BigDecimal.ZERO;
        this.discrepancyAmount = discrepancyAmount != null ? discrepancyAmount : BigDecimal.ZERO;
        this.discrepancyNotes = discrepancyNotes;
        this.status = status != null ? status : "SUBMITTED";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getStandLocation() { return standLocation; }
    public void setStandLocation(String standLocation) { this.standLocation = standLocation; }

    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }

    public String getShiftName() { return shiftName; }
    public void setShiftName(String shiftName) { this.shiftName = shiftName; }

    public UUID getFinanceResponsibleId() { return financeResponsibleId; }
    public void setFinanceResponsibleId(UUID financeResponsibleId) { this.financeResponsibleId = financeResponsibleId; }

    public String getFinanceResponsibleName() { return financeResponsibleName; }
    public void setFinanceResponsibleName(String financeResponsibleName) { this.financeResponsibleName = financeResponsibleName; }

    public BigDecimal getCashCollected() { return cashCollected; }
    public void setCashCollected(BigDecimal cashCollected) { this.cashCollected = cashCollected; }

    public BigDecimal getPosCardCollected() { return posCardCollected; }
    public void setPosCardCollected(BigDecimal posCardCollected) { this.posCardCollected = posCardCollected; }

    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }

    public BigDecimal getClosingBalance() { return closingBalance; }
    public void setClosingBalance(BigDecimal closingBalance) { this.closingBalance = closingBalance; }

    public BigDecimal getDiscrepancyAmount() { return discrepancyAmount; }
    public void setDiscrepancyAmount(BigDecimal discrepancyAmount) { this.discrepancyAmount = discrepancyAmount; }

    public String getDiscrepancyNotes() { return discrepancyNotes; }
    public void setDiscrepancyNotes(String discrepancyNotes) { this.discrepancyNotes = discrepancyNotes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public BigDecimal getTotalCollected() {
        return (cashCollected != null ? cashCollected : BigDecimal.ZERO)
                .add(posCardCollected != null ? posCardCollected : BigDecimal.ZERO);
    }
}
