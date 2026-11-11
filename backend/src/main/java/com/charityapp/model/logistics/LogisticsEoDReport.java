package com.charityapp.model.logistics;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "eod_reports", schema = "logistics")
public class LogisticsEoDReport {
    @Id
    private UUID id;

    @Column(name = "stand_id")
    private UUID standId;

    @Column(name = "stand_name", nullable = false)
    private String standName;

    @Column(name = "closing_person_name", nullable = false)
    private String closingPersonName;

    @Column(name = "closed_at", nullable = false)
    private LocalDateTime closedAt = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String notes;

    public LogisticsEoDReport() {}

    public LogisticsEoDReport(UUID id, UUID standId, String standName, String closingPersonName, String notes) {
        this.id = id != null ? id : UUID.randomUUID();
        this.standId = standId;
        this.standName = standName;
        this.closingPersonName = closingPersonName;
        this.notes = notes;
        this.closedAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (closedAt == null) closedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getStandId() { return standId; }
    public void setStandId(UUID standId) { this.standId = standId; }
    public String getStandName() { return standName; }
    public void setStandName(String standName) { this.standName = standName; }
    public String getClosingPersonName() { return closingPersonName; }
    public void setClosingPersonName(String closingPersonName) { this.closingPersonName = closingPersonName; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
