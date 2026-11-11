package com.charityapp.repository.logistics;

import com.charityapp.model.logistics.StockAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, UUID> {
    List<StockAdjustment> findAllByOrderByTimestampDesc();
    List<StockAdjustment> findByItemIdOrderByTimestampDesc(UUID itemId);
    List<StockAdjustment> findByLocationIdOrderByTimestampDesc(UUID locationId);
}
