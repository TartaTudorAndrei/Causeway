package com.charityapp.dto.logistics;

import java.util.List;
import java.util.UUID;

public class TransferRequest {
    private UUID sourceLocationId;
    private UUID destinationLocationId;
    private List<ItemQuantity> items;
    private String performedBy;
    private String notes;

    public static class ItemQuantity {
        private UUID itemId;
        private int quantity;

        public ItemQuantity() {}
        public ItemQuantity(UUID itemId, int quantity) {
            this.itemId = itemId;
            this.quantity = quantity;
        }

        public UUID getItemId() { return itemId; }
        public void setItemId(UUID itemId) { this.itemId = itemId; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
    }

    public TransferRequest() {}

    public UUID getSourceLocationId() { return sourceLocationId; }
    public void setSourceLocationId(UUID sourceLocationId) { this.sourceLocationId = sourceLocationId; }
    public UUID getDestinationLocationId() { return destinationLocationId; }
    public void setDestinationLocationId(UUID destinationLocationId) { this.destinationLocationId = destinationLocationId; }
    public List<ItemQuantity> getItems() { return items; }
    public void setItems(List<ItemQuantity> items) { this.items = items; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
