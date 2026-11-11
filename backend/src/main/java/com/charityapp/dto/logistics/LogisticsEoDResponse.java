package com.charityapp.dto.logistics;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class LogisticsEoDResponse {
    private UUID id;
    private UUID standId;
    private String standName;
    private String closingPersonName;
    private LocalDateTime closedAt;
    private String notes;
    private List<MugCountDetail> mugCounts;

    public static class MugCountDetail {
        private UUID id;
        private UUID itemId;
        private String itemName;
        private int countRemaining;

        public MugCountDetail() {}

        public MugCountDetail(UUID id, UUID itemId, String itemName, int countRemaining) {
            this.id = id;
            this.itemId = itemId;
            this.itemName = itemName;
            this.countRemaining = countRemaining;
        }

        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public UUID getItemId() { return itemId; }
        public void setItemId(UUID itemId) { this.itemId = itemId; }
        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }
        public int getCountRemaining() { return countRemaining; }
        public void setCountRemaining(int countRemaining) { this.countRemaining = countRemaining; }
    }

    public LogisticsEoDResponse() {}

    public LogisticsEoDResponse(UUID id, UUID standId, String standName, String closingPersonName, LocalDateTime closedAt, String notes, List<MugCountDetail> mugCounts) {
        this.id = id;
        this.standId = standId;
        this.standName = standName;
        this.closingPersonName = closingPersonName;
        this.closedAt = closedAt;
        this.notes = notes;
        this.mugCounts = mugCounts;
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
    public List<MugCountDetail> getMugCounts() { return mugCounts; }
    public void setMugCounts(List<MugCountDetail> mugCounts) { this.mugCounts = mugCounts; }
}
