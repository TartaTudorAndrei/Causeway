package com.charityapp.service.logistics;

import com.charityapp.dto.logistics.StandStatisticsResponse;
import com.charityapp.model.hr.HrStand;
import com.charityapp.model.logistics.*;
import com.charityapp.repository.logistics.*;
import com.charityapp.service.hr.HrService;
import com.charityapp.service.logistics.LogisticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

public class LogisticsServiceTest {

    private StockLocationRepository locationRepository;
    private StockItemRepository itemRepository;
    private LocationStockRepository stockRepository;
    private StockTransferRepository transferRepository;
    private StockTransferItemRepository transferItemRepository;
    private StockAdjustmentRepository adjustmentRepository;
    private LogisticsEoDReportRepository eodReportRepository;
    private LogisticsEoDMugCountRepository eodMugCountRepository;
    private HrService hrService;
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private LogisticsService logisticsService;

    @BeforeEach
    public void setUp() {
        locationRepository = Mockito.mock(StockLocationRepository.class);
        itemRepository = Mockito.mock(StockItemRepository.class);
        stockRepository = Mockito.mock(LocationStockRepository.class);
        transferRepository = Mockito.mock(StockTransferRepository.class);
        transferItemRepository = Mockito.mock(StockTransferItemRepository.class);
        adjustmentRepository = Mockito.mock(StockAdjustmentRepository.class);
        eodReportRepository = Mockito.mock(LogisticsEoDReportRepository.class);
        eodMugCountRepository = Mockito.mock(LogisticsEoDMugCountRepository.class);
        hrService = Mockito.mock(HrService.class);
        eventPublisher = Mockito.mock(org.springframework.context.ApplicationEventPublisher.class);
        when(locationRepository.save(Mockito.any())).thenAnswer(i -> i.getArgument(0));

        logisticsService = new LogisticsService(
                locationRepository,
                itemRepository,
                stockRepository,
                transferRepository,
                transferItemRepository,
                adjustmentRepository,
                eodReportRepository,
                eodMugCountRepository,
                hrService,
                eventPublisher
        );
    }

    @Test
    public void testStandStatisticsCalculation() {
        UUID standId = UUID.randomUUID();
        UUID centralLocId = UUID.randomUUID();
        UUID standLocId = UUID.randomUUID();
        UUID mug1Id = UUID.randomUUID();
        UUID mug2Id = UUID.randomUUID();

        // 1. Mock Stand & Locations
        HrStand hrStand = new HrStand(standId, "Stand Piata Unirii", "Targ Craciun", LocalDate.now(), "COMPLETED", "Notes");
        when(hrService.getAllStands()).thenReturn(List.of(hrStand));

        StockLocation centralLoc = new StockLocation(centralLocId, "Depozit Central", "DEP-01", "DEPOSIT", "Central", true);
        StockLocation standLoc = new StockLocation(standLocId, "Stand Piata Unirii", "LOC-01", "STAND", "Stand", false);
        when(locationRepository.findAll()).thenReturn(List.of(centralLoc, standLoc));

        // 2. Mock Mug Items
        StockItem mug1 = new StockItem(mug1Id, "Charity Item Red", "ITEM-RED", "Merchandise", "buc", null);
        mug1.setMug(true);
        StockItem mug2 = new StockItem(mug2Id, "Charity Item Blue", "ITEM-BLUE", "Merchandise", "buc", null);
        mug2.setMug(true);
        when(itemRepository.findAll()).thenReturn(List.of(mug1, mug2));

        // 3. Mock Transfers
        // Transfer 1 (Opening): Central -> Stand (50 Red, 40 Blue)
        UUID trf1Id = UUID.randomUUID();
        StockTransfer trf1 = new StockTransfer(centralLocId, standLocId, "Operator 1", "Opening batch");
        trf1.setId(trf1Id);
        trf1.setTimestamp(LocalDateTime.now().minusHours(8));
        StockTransferItem t1i1 = new StockTransferItem(trf1Id, mug1Id, 50);
        StockTransferItem t1i2 = new StockTransferItem(trf1Id, mug2Id, 40);

        // Transfer 2 (Restock): Central -> Stand (20 Red)
        UUID trf2Id = UUID.randomUUID();
        StockTransfer trf2 = new StockTransfer(centralLocId, standLocId, "Operator 2", "Restock midday");
        trf2.setId(trf2Id);
        trf2.setTimestamp(LocalDateTime.now().minusHours(4));
        StockTransferItem t2i1 = new StockTransferItem(trf2Id, mug1Id, 20);

        // Transfer 3 (Outbound return): Stand -> Central (5 Red)
        UUID trf3Id = UUID.randomUUID();
        StockTransfer trf3 = new StockTransfer(standLocId, centralLocId, "Operator 1", "Shift return");
        trf3.setId(trf3Id);
        trf3.setTimestamp(LocalDateTime.now().minusHours(2));
        StockTransferItem t3i1 = new StockTransferItem(trf3Id, mug1Id, 5);

        when(transferRepository.findAllByOrderByTimestampAsc()).thenReturn(List.of(trf1, trf2, trf3));
        when(transferItemRepository.findAll()).thenReturn(List.of(t1i1, t1i2, t2i1, t3i1));

        // 4. Mock EoD Report: Red remaining = 15, Blue remaining = 10
        UUID eodId = UUID.randomUUID();
        LogisticsEoDReport eodReport = new LogisticsEoDReport(eodId, standId, "Stand Piata Unirii", "Voluntar Elena", "Stand inchis cu succes");
        eodReport.setClosedAt(LocalDateTime.now().minusHours(1));

        LogisticsEoDMugCount eodMug1 = new LogisticsEoDMugCount(UUID.randomUUID(), eodId, mug1Id, "Charity Item Red", 15);
        LogisticsEoDMugCount eodMug2 = new LogisticsEoDMugCount(UUID.randomUUID(), eodId, mug2Id, "Charity Item Blue", 10);

        when(eodReportRepository.findAllByOrderByClosedAtDesc()).thenReturn(List.of(eodReport));
        when(eodMugCountRepository.findAll()).thenReturn(List.of(eodMug1, eodMug2));
        when(stockRepository.findAll()).thenReturn(Collections.emptyList());

        // Execute
        List<StandStatisticsResponse> statsList = logisticsService.getStandStatistics();

        // Assertions
        assertNotNull(statsList);
        assertEquals(1, statsList.size());

        StandStatisticsResponse standStat = statsList.get(0);
        assertEquals("Stand Piata Unirii", standStat.getLocationName());
        assertTrue(standStat.isClosed());
        assertEquals("Voluntar Elena", standStat.getClosingPersonName());

        // Opening: Red = 50, Blue = 40 => Total Opened = 90
        assertEquals(90, standStat.getTotalMugsOpened());

        // Restock: Red = 20 => Total Restocked = 20
        assertEquals(20, standStat.getTotalMugsRestocked());

        // Transferred In: 50 + 40 + 20 = 110
        assertEquals(110, standStat.getTotalMugsTransferredIn());

        // Transferred Out: 5
        assertEquals(5, standStat.getTotalMugsTransferredOut());

        // Total Net Supplied: 110 - 5 = 105 (Red: 70-5=65, Blue: 40)
        assertEquals(105, standStat.getTotalMugsSupplied());

        // Ended with (from EoD): Red 15, Blue 10 => 25
        assertEquals(25, standStat.getTotalMugsEnded());

        // Total Sold: 105 - 25 = 80 (Red: 65-15=50, Blue: 40-10=30)
        assertEquals(80, standStat.getTotalMugsSold());

        // Sell-through: 80 / 105 = 76.2%
        assertEquals(76.2, standStat.getMugSellThroughRate(), 0.1);

        // Check Transfers Audit Trail
        assertEquals(3, standStat.getTransfers().size());
    }

    @Test
    public void testNoStandStatisticsWithoutEoDReport() {
        // When no EoD report has been submitted, getStandStatistics should be empty
        when(eodReportRepository.findAllByOrderByClosedAtDesc()).thenReturn(Collections.emptyList());

        List<StandStatisticsResponse> statsList = logisticsService.getStandStatistics();
        assertNotNull(statsList);
        assertTrue(statsList.isEmpty());
    }

    @Test
    public void testLocationsUnificationWithHr() {
        UUID loc1 = UUID.randomUUID();
        StockLocation deposit = new StockLocation(loc1, "Depozit Central", "DEP-01", "DEPOSIT", "Desc", true);
        StockLocation deposit2 = new StockLocation(UUID.randomUUID(), "Depozit Sud", "DEP-02", "DEPOSIT", "Desc", false);
        when(locationRepository.findAll()).thenReturn(new ArrayList<>(List.of(deposit, deposit2)));

        HrStand hrStand = new HrStand(UUID.randomUUID(), "Stand Piata Muzeului", "Targ", LocalDate.now(), "ACTIVE", "Notes");
        when(hrService.getAllStands()).thenReturn(List.of(hrStand));

        List<StockLocation> locations = logisticsService.getLocations();
        assertNotNull(locations);
        assertTrue(locations.stream().anyMatch(l -> "Stand Piata Muzeului".equals(l.getName()) && "STAND".equals(l.getType())));
        assertTrue(locations.stream().anyMatch(l -> "Depozit Central".equals(l.getName()) && "DEPOSIT".equals(l.getType())));
        assertTrue(locations.stream().anyMatch(l -> "Depozit Sud".equals(l.getName()) && "DEPOSIT".equals(l.getType())));
    }

    @Test
    public void testUpdateEoDReport() {
        UUID reportId = UUID.randomUUID();
        UUID standId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        LogisticsEoDReport existing = new LogisticsEoDReport(reportId, standId, "Stand Vechi", "Operator 1", "Note vechi");
        when(eodReportRepository.findById(reportId)).thenReturn(Optional.of(existing));
        when(eodReportRepository.save(Mockito.any())).thenAnswer(i -> i.getArgument(0));

        // Mock transfers to stand: 20 supplied
        UUID trfId = UUID.randomUUID();
        StockTransfer trf = new StockTransfer(UUID.randomUUID(), standId, "Op", "Supply");
        trf.setId(trfId);
        when(transferRepository.findAll()).thenReturn(List.of(trf));
        when(transferItemRepository.findAll()).thenReturn(List.of(new StockTransferItem(trfId, itemId, 20)));

        com.charityapp.dto.logistics.LogisticsEoDSubmitRequest updateReq =
                new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest(
                        standId,
                        "Stand Modificat",
                        "Operator Modificat",
                        "Note modificate",
                        List.of(new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem(itemId, "Charity Item", 12))
                );

        com.charityapp.dto.logistics.LogisticsEoDResponse updated =
                logisticsService.updateEoDReport(reportId, updateReq);

        assertNotNull(updated);
        assertEquals("Stand Modificat", updated.getStandName());
        assertEquals("Operator Modificat", updated.getClosingPersonName());
        assertEquals("Note modificate", updated.getNotes());
        assertEquals(1, updated.getMugCounts().size());
        assertEquals(12, updated.getMugCounts().get(0).getCountRemaining());
    }

    @Test
    public void testSubmitEoDReport_AllowsRemainingCount() {
        UUID standId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        UUID trfId = UUID.randomUUID();
        StockTransfer trf = new StockTransfer(UUID.randomUUID(), standId, "Op", "Supply");
        trf.setId(trfId);
        when(transferRepository.findAll()).thenReturn(List.of(trf));
        when(transferItemRepository.findAll()).thenReturn(List.of(new StockTransferItem(trfId, itemId, 10)));
        when(eodReportRepository.save(Mockito.any())).thenAnswer(i -> i.getArgument(0));

        com.charityapp.dto.logistics.LogisticsEoDSubmitRequest req =
                new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest(
                        standId,
                        "Stand Piata Unirii",
                        "Voluntar",
                        "Inchidere",
                        List.of(new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem(itemId, "Charity Item", 15))
                );

        com.charityapp.dto.logistics.LogisticsEoDResponse resp = logisticsService.submitEoDReport(req);
        assertNotNull(resp);
        assertEquals(1, resp.getMugCounts().size());
        assertEquals(15, resp.getMugCounts().get(0).getCountRemaining());
    }

    @Test
    public void testSubmitEoDReport_FailsOnNegativeCount() {
        UUID standId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        com.charityapp.dto.logistics.LogisticsEoDSubmitRequest req =
                new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest(
                        standId,
                        "Stand",
                        "Operator",
                        "Notes",
                        List.of(new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem(itemId, "Charity Item", -5))
                );

        assertThrows(IllegalArgumentException.class, () -> logisticsService.submitEoDReport(req));
    }

    @Test
    public void testSubmitEoDReport_ReconcilesLocationStock() {
        UUID standId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        // 100 mugs supplied to stand
        UUID trfId = UUID.randomUUID();
        StockTransfer trf = new StockTransfer(UUID.randomUUID(), standId, "Op", "Supply");
        trf.setId(trfId);
        when(transferRepository.findAll()).thenReturn(List.of(trf));
        when(transferItemRepository.findAll()).thenReturn(List.of(new StockTransferItem(trfId, itemId, 100)));
        when(locationRepository.existsById(standId)).thenReturn(true);
        when(locationRepository.findAll()).thenReturn(List.of(new StockLocation(standId, "Stand Piata Unirii", "LOC-01", "STAND", "Stand", false)));

        LocationStock existingStock = new LocationStock(itemId, standId, 100);
        when(stockRepository.findByItemIdAndLocationId(itemId, standId)).thenReturn(Optional.of(existingStock));
        when(eodReportRepository.save(Mockito.any())).thenAnswer(i -> i.getArgument(0));

        com.charityapp.dto.logistics.LogisticsEoDSubmitRequest req =
                new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest(
                        standId,
                        "Stand Piata Unirii",
                        "Voluntar",
                        "Inchidere",
                        List.of(new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem(itemId, "Charity Item", 20))
                );

        com.charityapp.dto.logistics.LogisticsEoDResponse resp = logisticsService.submitEoDReport(req);
        assertNotNull(resp);
        assertEquals(20, existingStock.getQuantity());
        Mockito.verify(stockRepository).save(existingStock);
    }

    @Test
    public void testDeleteEoDReport_RestoresSuppliedStock() {
        UUID reportId = UUID.randomUUID();
        UUID standId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        LogisticsEoDReport report = new LogisticsEoDReport(reportId, standId, "Stand Piata Unirii", "Operator", "Notes");
        when(eodReportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(locationRepository.existsById(standId)).thenReturn(true);
        when(locationRepository.findAll()).thenReturn(List.of(new StockLocation(standId, "Stand Piata Unirii", "LOC-01", "STAND", "Stand", false)));

        // 100 was originally supplied
        UUID trfId = UUID.randomUUID();
        StockTransfer trf = new StockTransfer(UUID.randomUUID(), standId, "Op", "Supply");
        trf.setId(trfId);
        when(transferRepository.findAll()).thenReturn(List.of(trf));
        when(transferItemRepository.findAll()).thenReturn(List.of(new StockTransferItem(trfId, itemId, 100)));

        // End of day report had 20 remaining
        LogisticsEoDMugCount mugCount = new LogisticsEoDMugCount(UUID.randomUUID(), reportId, itemId, "Item", 20);
        when(eodMugCountRepository.findByEodReportId(reportId)).thenReturn(List.of(mugCount));

        LocationStock currentStock = new LocationStock(itemId, standId, 20);
        when(stockRepository.findByItemIdAndLocationId(itemId, standId)).thenReturn(Optional.of(currentStock));

        logisticsService.deleteEoDReport(reportId);

        // Should restore stock back to supplied 100
        assertEquals(100, currentStock.getQuantity());
        Mockito.verify(stockRepository).save(currentStock);
        Mockito.verify(eodReportRepository).deleteById(reportId);
    }

    @Test
    public void testDuplicatedStandDoesNotInheritEoDReport() {
        UUID stand1Id = UUID.randomUUID();
        UUID stand2Id = UUID.randomUUID();
        UUID locId = UUID.randomUUID();
        UUID mugId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        // Original stand (closed with EoD) and duplicated stand (for tomorrow, planned, no EoD)
        HrStand stand1 = new HrStand(stand1Id, "Stand Piata Unirii", "Targ Craciun", today, "COMPLETED", "Notes 1");
        HrStand stand2 = new HrStand(stand2Id, "Stand Piata Unirii", "Targ Craciun", tomorrow, "PLANNED", "Notes 2");
        when(hrService.getAllStands()).thenReturn(List.of(stand1, stand2));

        StockLocation standLoc = new StockLocation(locId, "Stand Piata Unirii", "LOC-01", "STAND", "Stand", false);
        when(locationRepository.findAll()).thenReturn(List.of(standLoc));

        StockItem mug = new StockItem(mugId, "Charity Item Red", "ITEM-RED", "Merchandise", "buc", null);
        mug.setMug(true);
        when(itemRepository.findAll()).thenReturn(List.of(mug));

        // EoD report ONLY for stand1
        UUID eodId = UUID.randomUUID();
        LogisticsEoDReport eodReport = new LogisticsEoDReport(eodId, stand1Id, "Stand Piata Unirii", "Voluntar Elena", "Inchidere zi");
        eodReport.setClosedAt(LocalDateTime.now().minusHours(2));

        LogisticsEoDMugCount eodMug = new LogisticsEoDMugCount(UUID.randomUUID(), eodId, mugId, "Charity Item Red", 10);

        when(eodReportRepository.findAllByOrderByClosedAtDesc()).thenReturn(List.of(eodReport));
        when(eodMugCountRepository.findAll()).thenReturn(List.of(eodMug));
        when(stockRepository.findAll()).thenReturn(Collections.emptyList());
        when(transferRepository.findAllByOrderByTimestampAsc()).thenReturn(Collections.emptyList());
        when(transferItemRepository.findAll()).thenReturn(Collections.emptyList());

        List<StandStatisticsResponse> statsList = logisticsService.getStandStatistics();
        assertNotNull(statsList);
        // Only stand1 (which has an EoD report) should be present in stand statistics
        assertEquals(1, statsList.size());

        // Find stats for stand1
        StandStatisticsResponse stat1 = statsList.get(0);
        assertEquals(stand1Id, stat1.getStandId());
        assertTrue(stat1.isClosed());
        assertEquals(eodId, stat1.getEodReportId());
        assertEquals("Voluntar Elena", stat1.getClosingPersonName());

        // Verify stand2 is not present in stand statistics
        boolean stand2Present = statsList.stream().anyMatch(s -> stand2Id.equals(s.getStandId()));
        assertFalse(stand2Present, "Duplicated open/planned stand should NOT appear in stand statistics");
    }

    @Test
    public void testSubmitEoDReport_FailsWhenStandNotStartedYet() {
        UUID standId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        LocalDate futureDate = LocalDate.now().plusDays(2);

        HrStand futureStand = new HrStand(standId, "Stand Viitor", "Eveniment", futureDate, "ACTIVE", "Notes");
        com.charityapp.model.hr.HrShift shift = new com.charityapp.model.hr.HrShift(
                UUID.randomUUID(), standId, "Schimb 1", "08:00", "12:00"
        );
        futureStand.setShifts(List.of(shift));
        when(hrService.getAllStands()).thenReturn(List.of(futureStand));

        com.charityapp.dto.logistics.LogisticsEoDSubmitRequest req =
                new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest(
                        standId,
                        "Stand Viitor",
                        "Voluntar",
                        "Inchidere prematura",
                        List.of(new com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem(itemId, "Charity Item", 5))
                );

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> logisticsService.submitEoDReport(req));
        assertTrue(ex.getMessage().contains("Standul nu a început încă"));
    }
}
