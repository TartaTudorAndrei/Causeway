package com.charityapp.model.logistics;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "eod_report_mugs", schema = "logistics")
public class LogisticsEoDMugCount {
    @Id
    private UUID id;

    @Column(name = "eod_report_id", nullable = false)
    private UUID eodReportId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "count_remaining", nullable = false)
    private int countRemaining;

    public LogisticsEoDMugCount() {}

    public LogisticsEoDMugCount(UUID id, UUID eodReportId, UUID itemId, String itemName, int countRemaining) {
        this.id = id != null ? id : UUID.randomUUID();
        this.eodReportId = eodReportId;
        this.itemId = itemId;
        this.itemName = itemName;
        this.countRemaining = countRemaining;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEodReportId() { return eodReportId; }
    public void setEodReportId(UUID eodReportId) { this.eodReportId = eodReportId; }
    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public int getCountRemaining() { return countRemaining; }
    public void setCountRemaining(int countRemaining) { this.countRemaining = countRemaining; }
}
