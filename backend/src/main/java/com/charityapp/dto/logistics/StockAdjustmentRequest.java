package com.charityapp.dto.logistics;

import java.util.UUID;

public class StockAdjustmentRequest {
    private UUID itemId;
    private UUID locationId;
    private Integer newQuantity;
    private String reason; // e.g. "INVENTORY_COUNT", "DAMAGE", "LOSS", "CORRECTION", "RESTOCK", "OTHER"
    private String notes;
    private String performedBy;

    public StockAdjustmentRequest() {}

    public StockAdjustmentRequest(UUID itemId, UUID locationId, Integer newQuantity, String reason, String notes, String performedBy) {
        this.itemId = itemId;
        this.locationId = locationId;
        this.newQuantity = newQuantity;
        this.reason = reason;
        this.notes = notes;
        this.performedBy = performedBy;
    }

    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }

    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }

    public Integer getNewQuantity() { return newQuantity; }
    public void setNewQuantity(Integer newQuantity) { this.newQuantity = newQuantity; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
