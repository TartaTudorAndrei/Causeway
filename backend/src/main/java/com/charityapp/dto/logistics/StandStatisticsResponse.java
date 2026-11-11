package com.charityapp.dto.logistics;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class StandStatisticsResponse {
    private UUID standId;
    private String standName;
    private String locationName;
    private String eventName;
    private LocalDate eventDate;
    private String status;
    private boolean isClosed;

    private UUID eodReportId;
    private LocalDateTime closedAt;
    private String closingPersonName;
    private String closingNotes;

    private int totalMugsOpened;
    private int totalMugsRestocked;
    private int totalMugsTransferredIn;
    private int totalMugsTransferredOut;
    private int totalMugsSupplied;
    private int totalMugsEnded;
    private int totalMugsSold;
    private double mugSellThroughRate;

    private List<StandItemStat> itemStats = new ArrayList<>();
    private List<StandTransferAudit> transfers = new ArrayList<>();

    public static class StandItemStat {
        private UUID itemId;
        private String itemName;
        private String sku;
        private String category;
        private String unit;
        @com.fasterxml.jackson.annotation.JsonProperty("isSellable")
        @com.fasterxml.jackson.annotation.JsonAlias({"isMug", "sellable", "mug"})
        private boolean isSellable;

        private int openedCount;
        private int restockedCount;
        private int totalTransferredIn;
        private int transferredOut;
        private int netSupplied;
        private int endedCount;
        private int soldCount;
        private double sellThroughRate;

        public StandItemStat() {}

        public StandItemStat(UUID itemId, String itemName, String sku, String category, String unit,
                             boolean isSellable, int openedCount, int restockedCount, int totalTransferredIn,
                             int transferredOut, int netSupplied, int endedCount, int soldCount, double sellThroughRate) {
            this.itemId = itemId;
            this.itemName = itemName;
            this.sku = sku;
            this.category = category;
            this.unit = unit;
            this.isSellable = isSellable;
            this.openedCount = openedCount;
            this.restockedCount = restockedCount;
            this.totalTransferredIn = totalTransferredIn;
            this.transferredOut = transferredOut;
            this.netSupplied = netSupplied;
            this.endedCount = endedCount;
            this.soldCount = soldCount;
            this.sellThroughRate = sellThroughRate;
        }

        public UUID getItemId() { return itemId; }
        public void setItemId(UUID itemId) { this.itemId = itemId; }

        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }

        public String getSku() { return sku; }
        public void setSku(String sku) { this.sku = sku; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }

        @com.fasterxml.jackson.annotation.JsonProperty("isSellable")
        public boolean isSellable() { return isSellable; }
        public void setSellable(boolean sellable) { this.isSellable = sellable; }

        @com.fasterxml.jackson.annotation.JsonProperty("isMug")
        public boolean isMug() { return isSellable; }
        public void setMug(boolean mug) { this.isSellable = mug; }

        public int getOpenedCount() { return openedCount; }
        public void setOpenedCount(int openedCount) { this.openedCount = openedCount; }

        public int getRestockedCount() { return restockedCount; }
        public void setRestockedCount(int restockedCount) { this.restockedCount = restockedCount; }

        public int getTotalTransferredIn() { return totalTransferredIn; }
        public void setTotalTransferredIn(int totalTransferredIn) { this.totalTransferredIn = totalTransferredIn; }

        public int getTransferredOut() { return transferredOut; }
        public void setTransferredOut(int transferredOut) { this.transferredOut = transferredOut; }

        public int getNetSupplied() { return netSupplied; }
        public void setNetSupplied(int netSupplied) { this.netSupplied = netSupplied; }

        public int getEndedCount() { return endedCount; }
        public void setEndedCount(int endedCount) { this.endedCount = endedCount; }

        public int getSoldCount() { return soldCount; }
        public void setSoldCount(int soldCount) { this.soldCount = soldCount; }

        public double getSellThroughRate() { return sellThroughRate; }
        public void setSellThroughRate(double sellThroughRate) { this.sellThroughRate = sellThroughRate; }
    }

    public static class StandTransferAudit {
        private UUID transferId;
        private String direction; // "INBOUND" or "OUTBOUND"
        private UUID sourceLocationId;
        private String sourceLocationName;
        private UUID destinationLocationId;
        private String destinationLocationName;
        private List<StockTransferResponse.TransferItemDetail> items;
        private LocalDateTime timestamp;
        private String performedBy;
        private String notes;

        public StandTransferAudit() {}

        public StandTransferAudit(UUID transferId, String direction, UUID sourceLocationId, String sourceLocationName,
                                  UUID destinationLocationId, String destinationLocationName,
                                  List<StockTransferResponse.TransferItemDetail> items, LocalDateTime timestamp,
                                  String performedBy, String notes) {
            this.transferId = transferId;
            this.direction = direction;
            this.sourceLocationId = sourceLocationId;
            this.sourceLocationName = sourceLocationName;
            this.destinationLocationId = destinationLocationId;
            this.destinationLocationName = destinationLocationName;
            this.items = items;
            this.timestamp = timestamp;
            this.performedBy = performedBy;
            this.notes = notes;
        }

        public UUID getTransferId() { return transferId; }
        public void setTransferId(UUID transferId) { this.transferId = transferId; }

        public String getDirection() { return direction; }
        public void setDirection(String direction) { this.direction = direction; }

        public UUID getSourceLocationId() { return sourceLocationId; }
        public void setSourceLocationId(UUID sourceLocationId) { this.sourceLocationId = sourceLocationId; }

        public String getSourceLocationName() { return sourceLocationName; }
        public void setSourceLocationName(String sourceLocationName) { this.sourceLocationName = sourceLocationName; }

        public UUID getDestinationLocationId() { return destinationLocationId; }
        public void setDestinationLocationId(UUID destinationLocationId) { this.destinationLocationId = destinationLocationId; }

        public String getDestinationLocationName() { return destinationLocationName; }
        public void setDestinationLocationName(String destinationLocationName) { this.destinationLocationName = destinationLocationName; }

        public List<StockTransferResponse.TransferItemDetail> getItems() { return items; }
        public void setItems(List<StockTransferResponse.TransferItemDetail> items) { this.items = items; }

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

        public String getPerformedBy() { return performedBy; }
        public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    public StandStatisticsResponse() {}

    public UUID getStandId() { return standId; }
    public void setStandId(UUID standId) { this.standId = standId; }

    public String getStandName() { return standName; }
    public void setStandName(String standName) { this.standName = standName; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isClosed() { return isClosed; }
    public void setClosed(boolean closed) { isClosed = closed; }

    public UUID getEodReportId() { return eodReportId; }
    public void setEodReportId(UUID eodReportId) { this.eodReportId = eodReportId; }

    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }

    public String getClosingPersonName() { return closingPersonName; }
    public void setClosingPersonName(String closingPersonName) { this.closingPersonName = closingPersonName; }

    public String getClosingNotes() { return closingNotes; }
    public void setClosingNotes(String closingNotes) { this.closingNotes = closingNotes; }

    public int getTotalMugsOpened() { return totalMugsOpened; }
    public void setTotalMugsOpened(int totalMugsOpened) { this.totalMugsOpened = totalMugsOpened; }

    public int getTotalMugsRestocked() { return totalMugsRestocked; }
    public void setTotalMugsRestocked(int totalMugsRestocked) { this.totalMugsRestocked = totalMugsRestocked; }

    public int getTotalMugsTransferredIn() { return totalMugsTransferredIn; }
    public void setTotalMugsTransferredIn(int totalMugsTransferredIn) { this.totalMugsTransferredIn = totalMugsTransferredIn; }

    public int getTotalMugsTransferredOut() { return totalMugsTransferredOut; }
    public void setTotalMugsTransferredOut(int totalMugsTransferredOut) { this.totalMugsTransferredOut = totalMugsTransferredOut; }

    public int getTotalMugsSupplied() { return totalMugsSupplied; }
    public void setTotalMugsSupplied(int totalMugsSupplied) { this.totalMugsSupplied = totalMugsSupplied; }

    public int getTotalMugsEnded() { return totalMugsEnded; }
    public void setTotalMugsEnded(int totalMugsEnded) { this.totalMugsEnded = totalMugsEnded; }

    public int getTotalMugsSold() { return totalMugsSold; }
    public void setTotalMugsSold(int totalMugsSold) { this.totalMugsSold = totalMugsSold; }

    public double getMugSellThroughRate() { return mugSellThroughRate; }
    public void setMugSellThroughRate(double mugSellThroughRate) { this.mugSellThroughRate = mugSellThroughRate; }

    public List<StandItemStat> getItemStats() { return itemStats; }
    public void setItemStats(List<StandItemStat> itemStats) { this.itemStats = itemStats; }

    public List<StandTransferAudit> getTransfers() { return transfers; }
    public void setTransfers(List<StandTransferAudit> transfers) { this.transfers = transfers; }
}
