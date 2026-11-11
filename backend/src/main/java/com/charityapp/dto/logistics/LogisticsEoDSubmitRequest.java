package com.charityapp.dto.logistics;

import java.util.List;
import java.util.UUID;

public class LogisticsEoDSubmitRequest {
    private UUID standId;
    private String standName;
    private String closingPersonName;
    private String notes;
    private List<MugCountItem> mugCounts;

    public static class MugCountItem {
        private UUID itemId;
        private String itemName;
        private int countRemaining;

        public MugCountItem() {}

        public MugCountItem(UUID itemId, String itemName, int countRemaining) {
            this.itemId = itemId;
            this.itemName = itemName;
            this.countRemaining = countRemaining;
        }

        public UUID getItemId() { return itemId; }
        public void setItemId(UUID itemId) { this.itemId = itemId; }
        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }
        public int getCountRemaining() { return countRemaining; }
        public void setCountRemaining(int countRemaining) { this.countRemaining = countRemaining; }
    }

    public LogisticsEoDSubmitRequest() {}

    public LogisticsEoDSubmitRequest(UUID standId, String standName, String closingPersonName, String notes, List<MugCountItem> mugCounts) {
        this.standId = standId;
        this.standName = standName;
        this.closingPersonName = closingPersonName;
        this.notes = notes;
        this.mugCounts = mugCounts;
    }

    public UUID getStandId() { return standId; }
    public void setStandId(UUID standId) { this.standId = standId; }
    public String getStandName() { return standName; }
    public void setStandName(String standName) { this.standName = standName; }
    public String getClosingPersonName() { return closingPersonName; }
    public void setClosingPersonName(String closingPersonName) { this.closingPersonName = closingPersonName; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public List<MugCountItem> getMugCounts() { return mugCounts; }
    public void setMugCounts(List<MugCountItem> mugCounts) { this.mugCounts = mugCounts; }
}
