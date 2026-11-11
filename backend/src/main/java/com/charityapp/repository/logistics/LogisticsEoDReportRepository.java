package com.charityapp.repository.logistics;

import com.charityapp.model.logistics.LogisticsEoDReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LogisticsEoDReportRepository extends JpaRepository<LogisticsEoDReport, UUID> {
    List<LogisticsEoDReport> findAllByOrderByClosedAtDesc();
    boolean existsByStandId(UUID standId);
}
