package com.charityapp.model.logistics;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "stock_transfer_items", schema = "logistics")
public class StockTransferItem {
    @Id
    private UUID id;

    @Column(name = "transfer_id", nullable = false)
    private UUID transferId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(nullable = false)
    private int quantity;

    public StockTransferItem() {}

    public StockTransferItem(UUID transferId, UUID itemId, int quantity) {
        this.id = UUID.randomUUID();
        this.transferId = transferId;
        this.itemId = itemId;
        this.quantity = quantity;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTransferId() { return transferId; }
    public void setTransferId(UUID transferId) { this.transferId = transferId; }
    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}
