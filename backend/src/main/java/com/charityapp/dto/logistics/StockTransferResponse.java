package com.charityapp.dto.logistics;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class StockTransferResponse {
    private UUID id;
    private UUID sourceLocationId;
    private String sourceLocationName;
    private UUID destinationLocationId;
    private String destinationLocationName;
    private List<TransferItemDetail> items;
    private LocalDateTime timestamp;
    private String performedBy;
    private String notes;

    public static class TransferItemDetail {
        private UUID itemId;
        private String itemName;
        private int quantity;
        private String unit;

        public TransferItemDetail() {}

        public TransferItemDetail(UUID itemId, String itemName, int quantity, String unit) {
            this.itemId = itemId;
            this.itemName = itemName;
            this.quantity = quantity;
            this.unit = unit;
        }

        public UUID getItemId() { return itemId; }
        public void setItemId(UUID itemId) { this.itemId = itemId; }
        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }
    }

    public StockTransferResponse() {}

    public StockTransferResponse(UUID id, UUID sourceLocationId, String sourceLocationName,
                                 UUID destinationLocationId, String destinationLocationName,
                                 List<TransferItemDetail> items, LocalDateTime timestamp,
                                 String performedBy, String notes) {
        this.id = id;
        this.sourceLocationId = sourceLocationId;
        this.sourceLocationName = sourceLocationName;
        this.destinationLocationId = destinationLocationId;
        this.destinationLocationName = destinationLocationName;
        this.items = items;
        this.timestamp = timestamp;
        this.performedBy = performedBy;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSourceLocationId() { return sourceLocationId; }
    public void setSourceLocationId(UUID sourceLocationId) { this.sourceLocationId = sourceLocationId; }
    public String getSourceLocationName() { return sourceLocationName; }
    public void setSourceLocationName(String sourceLocationName) { this.sourceLocationName = sourceLocationName; }
    public UUID getDestinationLocationId() { return destinationLocationId; }
    public void setDestinationLocationId(UUID destinationLocationId) { this.destinationLocationId = destinationLocationId; }
    public String getDestinationLocationName() { return destinationLocationName; }
    public void setDestinationLocationName(String destinationLocationName) { this.destinationLocationName = destinationLocationName; }
    public List<TransferItemDetail> getItems() { return items; }
    public void setItems(List<TransferItemDetail> items) { this.items = items; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
