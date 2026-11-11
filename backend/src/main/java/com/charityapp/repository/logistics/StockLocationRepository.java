package com.charityapp.repository.logistics;

import com.charityapp.model.logistics.StockLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockLocationRepository extends JpaRepository<StockLocation, UUID> {
    Optional<StockLocation> findByCode(String code);
    Optional<StockLocation> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
