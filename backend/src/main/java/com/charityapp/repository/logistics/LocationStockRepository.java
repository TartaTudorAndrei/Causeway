package com.charityapp.repository.logistics;

import com.charityapp.model.logistics.LocationStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LocationStockRepository extends JpaRepository<LocationStock, UUID> {
    Optional<LocationStock> findByItemIdAndLocationId(UUID itemId, UUID locationId);
    List<LocationStock> findByLocationId(UUID locationId);
    void deleteByLocationId(UUID locationId);
}
