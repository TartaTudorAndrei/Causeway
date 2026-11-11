package com.charityapp.repository.logistics;

import com.charityapp.model.logistics.StockTransferItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockTransferItemRepository extends JpaRepository<StockTransferItem, UUID> {
    List<StockTransferItem> findByTransferId(UUID transferId);
}
