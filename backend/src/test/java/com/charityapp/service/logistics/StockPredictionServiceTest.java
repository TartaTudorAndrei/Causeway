package com.charityapp.service.logistics;

import com.charityapp.dto.logistics.*;
import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.hr.HrShift;
import com.charityapp.model.hr.HrStand;
import com.charityapp.model.logistics.*;
import com.charityapp.repository.general.GeneralRepository;
import com.charityapp.repository.hr.HrRepository;
import com.charityapp.repository.logistics.*;
import com.charityapp.service.logistics.StockPredictionService;
import com.charityapp.service.logistics.GoogleMapsRoutingService;
import com.charityapp.service.logistics.WeatherForecastService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

public class StockPredictionServiceTest {

    private StockItemRepository itemRepository;
    private LocationStockRepository stockRepository;
    private StockLocationRepository locationRepository;
    private GeneralRepository generalRepository;
    private HrRepository hrRepository;
    private LogisticsEoDReportRepository eodReportRepository;
    private LogisticsEoDMugCountRepository eodMugCountRepository;
    private WeatherForecastService weatherForecastService;
    private GoogleMapsRoutingService googleMapsRoutingService;

    private StockPredictionService predictionService;

    @BeforeEach
    public void setUp() {
        itemRepository = Mockito.mock(StockItemRepository.class);
        stockRepository = Mockito.mock(LocationStockRepository.class);
        locationRepository = Mockito.mock(StockLocationRepository.class);
        generalRepository = Mockito.mock(GeneralRepository.class);
        hrRepository = Mockito.mock(HrRepository.class);
        eodReportRepository = Mockito.mock(LogisticsEoDReportRepository.class);
        eodMugCountRepository = Mockito.mock(LogisticsEoDMugCountRepository.class);
        weatherForecastService = Mockito.mock(WeatherForecastService.class);
        googleMapsRoutingService = Mockito.mock(GoogleMapsRoutingService.class);
        when(googleMapsRoutingService.computeRoute(Mockito.anyDouble(), Mockito.anyDouble(), Mockito.anyDouble(), Mockito.anyDouble(), Mockito.anyString()))
                .thenAnswer(inv -> new GoogleMapsRoutingService.RouteResult(500.0, 7, inv.getArgument(4), false));

        when(weatherForecastService.get14DayForecast()).thenReturn(Collections.emptyMap());
        when(weatherForecastService.getWeatherForDate(anyString())).thenReturn(
                new WeatherForecastService.DailyWeatherSummary(LocalDate.now().toString(), 4.0, -1.0, 0.0, 0.0, 1.0, "NORMAL", "Temperat")
        );

        predictionService = new StockPredictionService(
                itemRepository,
                stockRepository,
                locationRepository,
                generalRepository,
                hrRepository,
                eodReportRepository,
                eodMugCountRepository,
                weatherForecastService,
                googleMapsRoutingService
        );
    }

    @Test
    public void testPredictionWithSpecialDemandEventAndWeekendSpike() {
        UUID mugId = UUID.randomUUID();
        StockItem mug = new StockItem(mugId, "Charity Campaign Item 2026", "ITEM-2026", "Merchandise", "buc", null, true);
        mug.setMinSafetyStock(40);
        mug.setLeadTimeDays(2);
        mug.setTargetStock(200);
        mug.setDailyBurnRate(20.0);

        when(itemRepository.findAll()).thenReturn(List.of(mug));

        // Total stock of 50 mugs
        LocationStock stock = new LocationStock(mugId, UUID.randomUUID(), 50);
        when(stockRepository.findAll()).thenReturn(List.of(stock));

        // Create a special concert event tomorrow with a 2.5x multiplier
        String tomorrow = LocalDate.now().plusDays(1).toString();
        GeneralEvent concertEvent = new GeneralEvent(
                UUID.randomUUID(),
                "Winter Gala Concert",
                "Peak audience expected",
                tomorrow,
                "19:00",
                "general",
                "admin@example.org"
        );
        concertEvent.setSpecialDemand(true);
        concertEvent.setDemandMultiplier(2.5);
        concertEvent.setDemandTag("CONCERT");

        when(generalRepository.findSpecialDemandEvents()).thenReturn(List.of(concertEvent));

        StockPredictionResponse res = predictionService.getPredictions();

        assertNotNull(res);
        assertEquals(1, res.getPredictions().size());

        ItemPredictionDetail pred = res.getPredictions().get(0);
        assertEquals(mugId, pred.getItemId());
        assertEquals(50, pred.getTotalCurrentStock());
        assertTrue(pred.getDaysRemaining() < 4.0, "Runway should be short due to concert surge and weekend multipliers");
        assertNotNull(pred.getProjectedRunoutDate());
        assertEquals(14, pred.getDailyForecast().size());

        // Verify special event is included in response
        assertEquals(1, res.getUpcomingSpecialEvents().size());
        assertEquals("Winter Gala Concert", res.getUpcomingSpecialEvents().get(0).getTitle());
    }

    @Test
    public void testCriticalStatusWhenStockDepleted() {
        UUID itemId = UUID.randomUUID();
        StockItem item = new StockItem(itemId, "Napkins", "NAP-01", "Supplies", "pack", null, false);
        item.setMinSafetyStock(10);
        when(itemRepository.findAll()).thenReturn(List.of(item));
        when(stockRepository.findAll()).thenReturn(List.of()); // 0 stock

        StockPredictionResponse res = predictionService.getPredictions();

        assertEquals(1, res.getCriticalItemsCount());
        assertEquals("DEPLETED", res.getPredictions().get(0).getStatus());
        assertEquals(0, res.getPredictions().get(0).getTotalCurrentStock());
    }

    @Test
    public void testStandDispatchPrepRequirements() {
        UUID standId = UUID.randomUUID();
        HrStand stand = new HrStand(standId, "Stand Piata Unirii", "Targul de Craciun", LocalDate.now(), "PLANNED", "Main Stand");
        stand.setShifts(List.of(
                new HrShift(UUID.randomUUID(), standId, "Schimbul 1", "10:00", "14:00"),
                new HrShift(UUID.randomUUID(), standId, "Schimbul 2", "14:00", "18:00")
        ));

        when(hrRepository.findAllStands()).thenReturn(List.of(stand));

        UUID mugId = UUID.randomUUID();
        StockItem mug = new StockItem(mugId, "Campaign Item 2026", "ITEM-26", "Merchandise", "buc", null, true);
        when(itemRepository.findAll()).thenReturn(List.of(mug));
        when(stockRepository.findAll()).thenReturn(List.of());

        StandDispatchPrepResponse prep = predictionService.getStandDispatchPrep(standId, LocalDate.now().toString());

        assertNotNull(prep);
        assertEquals(standId, prep.getStandId());
        assertEquals(2, prep.getActiveShiftsCount());
        assertEquals(1, prep.getItems().size());
        StandDispatchItemDetail itemDetail = prep.getItems().get(0);
        assertTrue(itemDetail.getForecastedDemand() > 0);
        assertTrue(itemDetail.getSuggestedPackQuantity() > 0);
    }

    @Test
    public void testSmartRefillOptimizerThreeStrategies() {
        UUID destLocId = UUID.randomUUID();
        StockLocation destLoc = new StockLocation(destLocId, "Stand Piata Unirii", "STAND-UNIRII", "STAND", "Main", false);
        destLoc.setLatitude(BigDecimal.valueOf(46.7693));
        destLoc.setLongitude(BigDecimal.valueOf(23.5898));

        UUID depCentralId = UUID.randomUUID();
        StockLocation depCentral = new StockLocation(depCentralId, "Depozit Central", "DEP-CENTRAL", "DEPOSIT", "Warehouse", false);
        depCentral.setLatitude(BigDecimal.valueOf(46.7820));
        depCentral.setLongitude(BigDecimal.valueOf(23.6100));

        UUID standBId = UUID.randomUUID();
        StockLocation standB = new StockLocation(standBId, "Stand Piata Muzeului", "STAND-MUZEU", "STAND", "Satellite", false);
        standB.setLatitude(BigDecimal.valueOf(46.7716));
        standB.setLongitude(BigDecimal.valueOf(23.5878));

        when(locationRepository.findById(destLocId)).thenReturn(Optional.of(destLoc));
        when(locationRepository.findAll()).thenReturn(List.of(destLoc, depCentral, standB));

        UUID mugId = UUID.randomUUID();
        StockItem mug = new StockItem(mugId, "Charity Campaign Item", "ITEM-01", "Merchandise", "buc", null, true);
        when(itemRepository.findById(mugId)).thenReturn(Optional.of(mug));

        // Depozit Central has 100 mugs, Stand B has 25 mugs
        LocationStock stockDep = new LocationStock(mugId, depCentralId, 100);
        LocationStock stockB = new LocationStock(mugId, standBId, 25);
        when(stockRepository.findAll()).thenReturn(List.of(stockDep, stockB));
        when(stockRepository.findByItemIdAndLocationId(mugId, destLocId)).thenReturn(Optional.of(new LocationStock(mugId, destLocId, 5)));

        RefillOptimizerResponse res = predictionService.calculateRefillOptions(destLocId, mugId, 50);

        assertNotNull(res);
        assertEquals(destLocId, res.getDestinationLocationId());
        assertEquals(50, res.getRequestedQuantity());

        // Option 1 Express should pick Depozit Central (100% full stock)
        assertNotNull(res.getOption1Express());
        assertEquals("EXPRESS", res.getOption1Express().getStrategyCode());
        assertEquals(50, res.getOption1Express().getTotalFulfilledQuantity());
        assertTrue(res.getOption1Express().isFullFulfillment());

        // Option 2 Walking Emergency should pick Stand Muzeului (nearest on foot)
        assertNotNull(res.getOption2WalkingEmergency());
        assertEquals("WALKING_EMERGENCY", res.getOption2WalkingEmergency().getStrategyCode());
        assertEquals("WALK", res.getOption2WalkingEmergency().getPrimaryTransitMode());

        // Option 3 Multi Stop should also be calculated
        assertNotNull(res.getOption3MultiStop());
        assertEquals("MULTI_STOP", res.getOption3MultiStop().getStrategyCode());
    }
}
