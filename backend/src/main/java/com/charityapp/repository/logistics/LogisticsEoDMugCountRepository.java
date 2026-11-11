package com.charityapp.repository.logistics;

import com.charityapp.model.logistics.LogisticsEoDMugCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LogisticsEoDMugCountRepository extends JpaRepository<LogisticsEoDMugCount, UUID> {
    List<LogisticsEoDMugCount> findByEodReportId(UUID eodReportId);
    void deleteByEodReportId(UUID eodReportId);
}
