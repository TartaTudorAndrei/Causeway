package com.charityapp.service.logistics;

import com.charityapp.dto.logistics.*;
import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.hr.HrShift;
import com.charityapp.model.hr.HrStand;
import com.charityapp.model.logistics.*;
import com.charityapp.repository.general.GeneralRepository;
import com.charityapp.repository.hr.HrRepository;
import com.charityapp.repository.logistics.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StockPredictionService {

    private final StockItemRepository itemRepository;
    private final LocationStockRepository stockRepository;
    private final StockLocationRepository locationRepository;
    private final GeneralRepository generalRepository;
    private final HrRepository hrRepository;
    private final LogisticsEoDReportRepository eodReportRepository;
    private final LogisticsEoDMugCountRepository eodMugCountRepository;
    private final WeatherForecastService weatherForecastService;
    private final GoogleMapsRoutingService googleMapsRoutingService;

    private static final Map<DayOfWeek, Double> DAY_WEIGHTS = Map.of(
            DayOfWeek.MONDAY, 0.60,
            DayOfWeek.TUESDAY, 0.60,
            DayOfWeek.WEDNESDAY, 0.75,
            DayOfWeek.THURSDAY, 0.75,
            DayOfWeek.FRIDAY, 1.60,
            DayOfWeek.SATURDAY, 2.20,
            DayOfWeek.SUNDAY, 1.10
    );

    private static final double DEFAULT_FALLBACK_LAT = 46.7712;
    private static final double DEFAULT_FALLBACK_LON = 23.6236;

    public StockPredictionService(
            StockItemRepository itemRepository,
            LocationStockRepository stockRepository,
            StockLocationRepository locationRepository,
            GeneralRepository generalRepository,
            HrRepository hrRepository,
            LogisticsEoDReportRepository eodReportRepository,
            LogisticsEoDMugCountRepository eodMugCountRepository,
            WeatherForecastService weatherForecastService,
            GoogleMapsRoutingService googleMapsRoutingService) {
        this.itemRepository = itemRepository;
        this.stockRepository = stockRepository;
        this.locationRepository = locationRepository;
        this.generalRepository = generalRepository;
        this.hrRepository = hrRepository;
        this.eodReportRepository = eodReportRepository;
        this.eodMugCountRepository = eodMugCountRepository;
        this.weatherForecastService = weatherForecastService;
        this.googleMapsRoutingService = googleMapsRoutingService;
    }

    public double getLearnedStandBurnRatePerShift(UUID standId, String standLocationName, StockItem item) {
        if (item == null) return 10.0;

        double seedRate;
        if (item.getDailyBurnRate() != null && item.getDailyBurnRate() > 0) {
            seedRate = item.getDailyBurnRate();
        } else {
            boolean isTier1 = standLocationName != null && (
                    standLocationName.toLowerCase().contains("unirii") ||
                    standLocationName.toLowerCase().contains("central") ||
                    standLocationName.toLowerCase().contains("main")
            );
            if (item.isSellable() || item.isMug()) {
                seedRate = isTier1 ? 60.0 : 25.0;
            } else if ("BEVERAGE".equalsIgnoreCase(item.getCategory()) || "FOOD".equalsIgnoreCase(item.getCategory())) {
                seedRate = isTier1 ? 30.0 : 15.0;
            } else {
                seedRate = isTier1 ? 15.0 : 8.0;
            }
        }

        try {
            List<LogisticsEoDReport> reports = eodReportRepository.findAll();
            List<LogisticsEoDReport> matchedReports = reports.stream()
                    .filter(r -> (standId != null && standId.equals(r.getStandId())) ||
                            (standLocationName != null && r.getStandName() != null &&
                                    r.getStandName().toLowerCase().contains(standLocationName.toLowerCase())))
                    .collect(Collectors.toList());

            if (!matchedReports.isEmpty()) {
                double totalActualBurn = 0.0;
                int count = 0;

                for (LogisticsEoDReport rep : matchedReports) {
                    List<LogisticsEoDMugCount> counts = eodMugCountRepository.findByEodReportId(rep.getId());
                    for (LogisticsEoDMugCount mc : counts) {
                        if (mc.getItemId() != null && mc.getItemId().equals(item.getId())) {
                            double assumedInitialStock = seedRate * 1.2;
                            double consumed = Math.max(0, assumedInitialStock - mc.getCountRemaining());
                            totalActualBurn += consumed;
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    double avgActualBurn = totalActualBurn / count;
                    double alpha = 0.3;
                    return Math.round((alpha * avgActualBurn + (1.0 - alpha) * seedRate) * 10.0) / 10.0;
                }
            }
        } catch (Exception ignored) {}

        return seedRate;
    }

    public String[] classifyCadence(HrStand stand, List<HrStand> allStands) {
        if (stand == null || allStands == null || allStands.isEmpty()) {
            return new String[]{"OCAZIONAL_POPUP", "Ocazional / Pop-Up"};
        }

        String locName = stand.getLocationName() != null ? stand.getLocationName().trim().toLowerCase() : "";
        List<HrStand> locStands = allStands.stream()
                .filter(s -> s.getLocationName() != null && s.getLocationName().trim().toLowerCase().equals(locName))
                .collect(Collectors.toList());

        Set<LocalDate> dates = locStands.stream()
                .map(HrStand::getEventDate)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (dates.isEmpty()) {
            return new String[]{"OCAZIONAL_POPUP", "Ocazional / Pop-Up"};
        }

        long activeDaysCount = dates.size();

        boolean weekendOnly = dates.stream().allMatch(d -> {
            DayOfWeek dow = d.getDayOfWeek();
            return dow == DayOfWeek.FRIDAY || dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
        });

        if (weekendOnly && activeDaysCount >= 2) {
            return new String[]{"RECURENT_WEEKEND", "Recurent Weekend"};
        }

        if (activeDaysCount >= 10) {
            return new String[]{"ZILNIC", "Zilnic"};
        }

        if (activeDaysCount >= 2 && activeDaysCount <= 4) {
            return new String[]{"SCURTA_DURATA", "Scurtă Durată"};
        }

        return new String[]{"OCAZIONAL_POPUP", "Ocazional / Pop-Up"};
    }

        /**
     * Dynamically learns Day-of-Week demand weights from historical/live EoD reports, normalized to sum = 7.0.
     */
    public Map<DayOfWeek, Double> getDynamicDayOfWeekWeights() {
        Map<DayOfWeek, Double> weights = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek dow : DayOfWeek.values()) {
            weights.put(dow, DAY_WEIGHTS.getOrDefault(dow, 1.0));
        }

        try {
            List<LogisticsEoDReport> reports = eodReportRepository.findAll();
            if (reports.isEmpty()) return weights;

            Map<DayOfWeek, Double> actualBurnByDow = new EnumMap<>(DayOfWeek.class);
            Map<DayOfWeek, Integer> countByDow = new EnumMap<>(DayOfWeek.class);

            for (LogisticsEoDReport rep : reports) {
                if (rep.getClosedAt() == null) continue;
                DayOfWeek dow = rep.getClosedAt().getDayOfWeek();
                List<LogisticsEoDMugCount> counts = eodMugCountRepository.findByEodReportId(rep.getId());
                double reportBurn = 0.0;
                for (LogisticsEoDMugCount mc : counts) {
                    reportBurn += Math.max(0, 50 - mc.getCountRemaining());
                }
                actualBurnByDow.put(dow, actualBurnByDow.getOrDefault(dow, 0.0) + reportBurn);
                countByDow.put(dow, countByDow.getOrDefault(dow, 0) + 1);
            }

            double totalBurnSum = 0.0;
            int totalReportCount = 0;
            for (DayOfWeek dow : DayOfWeek.values()) {
                totalBurnSum += actualBurnByDow.getOrDefault(dow, 0.0);
                totalReportCount += countByDow.getOrDefault(dow, 0);
            }

            if (totalReportCount >= 3 && totalBurnSum > 0) {
                double globalAvg = totalBurnSum / totalReportCount;
                double alpha = 0.3; // EWMA learning factor

                double newSum = 0.0;
                for (DayOfWeek dow : DayOfWeek.values()) {
                    double baseWeight = DAY_WEIGHTS.getOrDefault(dow, 1.0);
                    int dCount = countByDow.getOrDefault(dow, 0);
                    if (dCount > 0) {
                        double observedRatio = (actualBurnByDow.get(dow) / dCount) / Math.max(1.0, globalAvg);
                        double learnedWeight = (alpha * observedRatio) + ((1.0 - alpha) * baseWeight);
                        weights.put(dow, learnedWeight);
                    }
                    newSum += weights.get(dow);
                }

                if (newSum > 0) {
                    double normFactor = 7.0 / newSum;
                    for (DayOfWeek dow : DayOfWeek.values()) {
                        weights.put(dow, Math.round(weights.get(dow) * normFactor * 100.0) / 100.0);
                    }
                }
            }
        } catch (Exception ignored) {}

        return weights;
    }

    public StockPredictionResponse getPredictions() {
        List<StockItem> items = itemRepository.findAll();
        List<LocationStock> stocks = stockRepository.findAll();

        Map<UUID, Integer> totalStockMap = new HashMap<>();
        for (LocationStock s : stocks) {
            totalStockMap.put(s.getItemId(), totalStockMap.getOrDefault(s.getItemId(), 0) + s.getQuantity());
        }

        List<GeneralEvent> specialEvents = Collections.emptyList();
        try {
            specialEvents = generalRepository.findSpecialDemandEvents();
        } catch (Exception ignored) {}

        Map<String, GeneralEvent> eventMapByDate = new HashMap<>();
        List<StockPredictionResponse.SpecialDemandEventDTO> upcomingEventsList = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate maxHorizon = today.plusDays(30);

        for (GeneralEvent e : specialEvents) {
            if (e.getDate() != null) {
                try {
                    LocalDate eventDate = LocalDate.parse(e.getDate());
                    if (!eventDate.isBefore(today) && !eventDate.isAfter(maxHorizon)) {
                        eventMapByDate.put(e.getDate(), e);
                        upcomingEventsList.add(new StockPredictionResponse.SpecialDemandEventDTO(
                                e.getId() != null ? e.getId().toString() : null,
                                e.getTitle(),
                                e.getDate(),
                                e.getTime(),
                                e.getDemandMultiplier() > 0 ? e.getDemandMultiplier() : 1.5,
                                e.getDemandTag()
                        ));
                    }
                } catch (Exception ignored) {}
            }
        }

        List<HrStand> allHrStands = Collections.emptyList();
        try {
            allHrStands = hrRepository.findAllStands();
        } catch (Exception ignored) {}

        Map<String, WeatherForecastService.DailyWeatherSummary> weatherMap = weatherForecastService.get14DayForecast();

        List<ItemPredictionDetail> predictions = new ArrayList<>();
        int criticalCount = 0;
        int warningCount = 0;
        int healthyCount = 0;

        for (StockItem item : items) {
            int currentStock = totalStockMap.getOrDefault(item.getId(), 0);
            int minSafetyStock = item.getMinSafetyStock();
            int leadTimeDays = item.getLeadTimeDays();
            int targetStock = item.getTargetStock();

            List<DailyStockForecast> dailyForecasts = new ArrayList<>();
            int simStock = currentStock;
            String runoutDate = null;
            boolean willRunoutDuringPeak = false;
            String depletingEventTitle = null;
            double accumulatedDaysRunway = 0.0;
            boolean runoutLogged = false;
            double total14DayDemand = 0.0;

            for (int i = 0; i < 14; i++) {
                LocalDate curDate = today.plusDays(i);
                String dateStr = curDate.toString();
                Map<DayOfWeek, Double> dynamicDowWeights = getDynamicDayOfWeekWeights();
                DayOfWeek dow = curDate.getDayOfWeek();
                double dayWeight = dynamicDowWeights.getOrDefault(dow, 1.0);

                List<HrStand> activeStandsOnDate = allHrStands.stream()
                        .filter(s -> curDate.equals(s.getEventDate()) &&
                                ("PLANNED".equalsIgnoreCase(s.getStatus()) || "ACTIVE".equalsIgnoreCase(s.getStatus())))
                        .collect(Collectors.toList());

                int activeStandsCount = activeStandsOnDate.size();
                int totalShiftsOnDate = 0;
                double dailyStandBaseSum = 0.0;

                for (HrStand stand : activeStandsOnDate) {
                    int shiftsCount = (stand.getShifts() != null && !stand.getShifts().isEmpty())
                            ? stand.getShifts().size()
                            : 1;
                    totalShiftsOnDate += shiftsCount;
                    double standRatePerShift = getLearnedStandBurnRatePerShift(stand.getId(), stand.getLocationName(), item);
                    dailyStandBaseSum += (standRatePerShift * shiftsCount);
                }

                if (dailyStandBaseSum <= 0) {
                    double defaultBaseRate = item.getDailyBurnRate() != null && item.getDailyBurnRate() > 0
                            ? item.getDailyBurnRate()
                            : (item.isSellable() || item.isMug() ? 25.0 : 15.0);
                    dailyStandBaseSum = defaultBaseRate;
                }

                WeatherForecastService.DailyWeatherSummary weather = weatherMap.getOrDefault(
                        dateStr,
                        new WeatherForecastService.DailyWeatherSummary(dateStr, 5.0, 0.0, 0.0, 0.0, 1.0, "NORMAL", "Temperat")
                );
                double weatherMult = weather.getMultiplier();

                GeneralEvent matchedEvent = eventMapByDate.get(dateStr);
                double eventMultiplier = 1.0;
                String eventTitle = null;
                String eventTag = null;
                if (matchedEvent != null) {
                    eventMultiplier = matchedEvent.getDemandMultiplier() > 0 ? matchedEvent.getDemandMultiplier() : 1.5;
                    eventTitle = matchedEvent.getTitle();
                    eventTag = matchedEvent.getDemandTag();
                }

                double projectedDailyDemand = dailyStandBaseSum * dayWeight * weatherMult * eventMultiplier;
                projectedDailyDemand = Math.round(projectedDailyDemand * 10.0) / 10.0;
                total14DayDemand += projectedDailyDemand;

                boolean isRunoutToday = false;
                if (simStock <= 0) {
                    if (!runoutLogged) {
                        runoutDate = dateStr;
                        runoutLogged = true;
                    }
                    isRunoutToday = true;
                    simStock = 0;
                } else if (simStock <= projectedDailyDemand) {
                    if (!runoutLogged) {
                        runoutDate = dateStr;
                        double fraction = (double) simStock / Math.max(1.0, projectedDailyDemand);
                        accumulatedDaysRunway += fraction;
                        runoutLogged = true;
                        if (eventMultiplier > 1.0 || dow == DayOfWeek.FRIDAY || dow == DayOfWeek.SATURDAY || weatherMult > 1.1) {
                            willRunoutDuringPeak = true;
                            depletingEventTitle = eventTitle != null ? eventTitle : (dow == DayOfWeek.SATURDAY ? "Weekend Peak (Saturday)" : "Weekend Peak");
                        }
                    }
                    isRunoutToday = true;
                    simStock = 0;
                } else {
                    if (!runoutLogged) {
                        accumulatedDaysRunway += 1.0;
                    }
                    simStock -= (int) Math.round(projectedDailyDemand);
                }

                String dowShort = dow.name().substring(0, 3);
                dailyForecasts.add(new DailyStockForecast(
                        dateStr,
                        dowShort,
                        Math.round(dayWeight * 100.0) / 100.0,
                        Math.round(eventMultiplier * 100.0) / 100.0,
                        eventTitle,
                        eventTag,
                        weatherMult,
                        weather.getConditionCode(),
                        weather.getTempMax(),
                        weather.getTempMin(),
                        activeStandsCount,
                        totalShiftsOnDate,
                        projectedDailyDemand,
                        Math.max(0, simStock),
                        isRunoutToday
                ));
            }

            double avgDailyDemand = Math.round((total14DayDemand / 14.0) * 10.0) / 10.0;
            if (!runoutLogged && currentStock > 0) {
                accumulatedDaysRunway = Math.round(((double) currentStock / Math.max(1.0, avgDailyDemand)) * 10.0) / 10.0;
            }

            double reorderPoint = (avgDailyDemand * leadTimeDays) + minSafetyStock;

            String status;
            if (currentStock <= 0) {
                status = "DEPLETED";
                criticalCount++;
            } else if (accumulatedDaysRunway <= leadTimeDays || currentStock <= minSafetyStock || (willRunoutDuringPeak && accumulatedDaysRunway <= 3.0)) {
                status = "CRITICAL_RUNOUT";
                criticalCount++;
            } else if (accumulatedDaysRunway <= 5.0 || currentStock <= (minSafetyStock * 1.6)) {
                status = "WARNING_LOW";
                warningCount++;
            } else {
                status = "HEALTHY";
                healthyCount++;
            }

            int recommendedRestock = 0;
            if ("CRITICAL_RUNOUT".equals(status) || "WARNING_LOW".equals(status) || "DEPLETED".equals(status)) {
                recommendedRestock = Math.max(0, targetStock - currentStock);
            }

            ItemPredictionDetail detail = new ItemPredictionDetail();
            detail.setItemId(item.getId());
            detail.setItemName(item.getName());
            detail.setSku(item.getSku());
            detail.setCategory(item.getCategory());
            detail.setUnit(item.getUnit());
            detail.setSellable(item.isSellable() || item.isMug());
            detail.setMug(item.isSellable() || item.isMug());
            detail.setTotalCurrentStock(currentStock);
            detail.setBaseDailyBurnRate(avgDailyDemand);
            detail.setMinSafetyStock(minSafetyStock);
            detail.setLeadTimeDays(leadTimeDays);
            detail.setTargetStock(targetStock);
            detail.setReorderPoint(Math.round(reorderPoint * 10.0) / 10.0);
            detail.setDaysRemaining(Math.round(accumulatedDaysRunway * 10.0) / 10.0);
            detail.setProjectedRunoutDate(runoutDate);
            detail.setStatus(status);
            detail.setWillRunOutDuringPeakEvent(willRunoutDuringPeak);
            detail.setDepletingEventName(depletingEventTitle);
            detail.setRecommendedRestockQuantity(recommendedRestock);
            detail.setDailyForecast(dailyForecasts);

            predictions.add(detail);
        }

        predictions.sort((a, b) -> {
            int scoreA = getStatusScore(a.getStatus(), a.isSellable() || a.isMug());
            int scoreB = getStatusScore(b.getStatus(), b.isSellable() || b.isMug());
            return Integer.compare(scoreB, scoreA);
        });

        return new StockPredictionResponse(
                predictions,
                criticalCount,
                warningCount,
                healthyCount,
                upcomingEventsList
        );
    }

    public StandDispatchPrepResponse getStandDispatchPrep(UUID standId, String dateStr) {
        List<HrStand> allStands = hrRepository.findAllStands();
        LocalDate targetDate = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();

        HrStand selectedStand = null;
        if (standId != null) {
            selectedStand = allStands.stream().filter(s -> standId.equals(s.getId())).findFirst().orElse(null);
        }
        if (selectedStand == null) {
            selectedStand = allStands.stream()
                    .filter(s -> s.getEventDate() != null && !s.getEventDate().isBefore(targetDate))
                    .findFirst()
                    .orElse(allStands.isEmpty() ? null : allStands.get(0));
        }

        List<StandDispatchPrepResponse.CampaignStandOptionDTO> standOptions = allStands.stream().map(s -> {
            String[] cadence = classifyCadence(s, allStands);
            return new StandDispatchPrepResponse.CampaignStandOptionDTO(
                    s.getId(),
                    s.getEventName() != null ? s.getEventName() : s.getLocationName(),
                    s.getLocationName(),
                    s.getEventDate() != null ? s.getEventDate().toString() : "",
                    s.getStatus(),
                    cadence[1]
            );
        }).collect(Collectors.toList());

        if (selectedStand == null) {
            StandDispatchPrepResponse empty = new StandDispatchPrepResponse();
            empty.setAllCampaignStands(standOptions);
            empty.setItems(Collections.emptyList());
            empty.setShifts(Collections.emptyList());
            return empty;
        }

        String actualDateStr = selectedStand.getEventDate() != null ? selectedStand.getEventDate().toString() : targetDate.toString();
        LocalDate standDate = selectedStand.getEventDate() != null ? selectedStand.getEventDate() : targetDate;
        DayOfWeek dow = standDate.getDayOfWeek();
        double dayWeight = DAY_WEIGHTS.getOrDefault(dow, 1.0);

        WeatherForecastService.DailyWeatherSummary weather = weatherForecastService.getWeatherForDate(actualDateStr);
        String[] cadence = classifyCadence(selectedStand, allStands);

        List<HrShift> shifts = selectedStand.getShifts() != null ? selectedStand.getShifts() : Collections.emptyList();
        int activeShiftsCount = Math.max(1, shifts.size());

        List<StandDispatchPrepResponse.ShiftSummaryDTO> shiftDTOs = shifts.stream().map(sh ->
                new StandDispatchPrepResponse.ShiftSummaryDTO(
                        sh.getId(),
                        sh.getShiftName(),
                        sh.getStartTime(),
                        sh.getEndTime()
                )
        ).collect(Collectors.toList());

        final String targetLocName = selectedStand.getLocationName();
        List<StockLocation> locations = locationRepository.findAll();
        StockLocation matchedLocation = locations.stream()
                .filter(l -> (targetLocName != null && l.getName().equalsIgnoreCase(targetLocName)) ||
                        (targetLocName != null && l.getName().toLowerCase().contains(targetLocName.toLowerCase())) ||
                        (targetLocName != null && targetLocName.toLowerCase().contains(l.getName().toLowerCase())))
                .findFirst()
                .orElse(null);

        Map<UUID, Integer> standStockMap = new HashMap<>();
        if (matchedLocation != null) {
            List<LocationStock> locStocks = stockRepository.findAll();
            for (LocationStock ls : locStocks) {
                if (ls.getLocationId().equals(matchedLocation.getId())) {
                    standStockMap.put(ls.getItemId(), ls.getQuantity());
                }
            }
        }

        List<StockItem> allItems = itemRepository.findAll();
        List<StandDispatchItemDetail> itemDetails = new ArrayList<>();

        for (StockItem item : allItems) {
            double ratePerShift = getLearnedStandBurnRatePerShift(selectedStand.getId(), selectedStand.getLocationName(), item);
            double forecastedDemand = ratePerShift * activeShiftsCount * dayWeight * weather.getMultiplier();
            forecastedDemand = Math.round(forecastedDemand * 10.0) / 10.0;

            int currentStock = standStockMap.getOrDefault(item.getId(), 0);
            int safetyBuffer = (int) Math.ceil(Math.max(4.0, forecastedDemand * 0.20));
            int suggestedPack = Math.max(0, (int) Math.ceil(forecastedDemand + safetyBuffer - currentStock));

            itemDetails.add(new StandDispatchItemDetail(
                    item.getId(),
                    item.getName(),
                    item.getSku(),
                    item.getCategory(),
                    item.getUnit(),
                    item.isSellable() || item.isMug(),
                    currentStock,
                    ratePerShift,
                    forecastedDemand,
                    safetyBuffer,
                    suggestedPack
            ));
        }

        itemDetails.sort((a, b) -> {
            if (a.isSellable() != b.isSellable()) {
                return a.isSellable() ? -1 : 1;
            }
            return Integer.compare(b.getSuggestedPackQuantity(), a.getSuggestedPackQuantity());
        });

        StandDispatchPrepResponse response = new StandDispatchPrepResponse();
        response.setStandId(selectedStand.getId());
        response.setStandName(selectedStand.getEventName() != null ? selectedStand.getEventName() : selectedStand.getLocationName());
        response.setLocationName(selectedStand.getLocationName());
        response.setEventDate(actualDateStr);
        response.setStatus(selectedStand.getStatus());
        response.setCadenceCode(cadence[0]);
        response.setCadenceLabel(cadence[1]);
        response.setActiveShiftsCount(activeShiftsCount);
        response.setShifts(shiftDTOs);
        response.setWeather(new StandDispatchPrepResponse.WeatherSummaryDTO(
                weather.getDate(),
                weather.getTempMax(),
                weather.getTempMin(),
                weather.getMultiplier(),
                weather.getConditionCode(),
                weather.getConditionLabel()
        ));
        response.setItems(itemDetails);
        response.setAllCampaignStands(standOptions);

        return response;
    }

    public RefillOptimizerResponse calculateRefillOptions(UUID destinationLocationId, UUID itemId, int neededQuantity) {
        if (destinationLocationId == null) {
            throw new IllegalArgumentException("Destination location is required");
        }
        if (itemId == null) {
            throw new IllegalArgumentException("Item is required");
        }
        if (neededQuantity <= 0) {
            neededQuantity = 50;
        }

        StockLocation destLoc = locationRepository.findById(destinationLocationId)
                .orElseThrow(() -> new IllegalArgumentException("Destination location not found"));
        StockItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        double destLat = getEffectiveLat(destLoc);
        double destLon = getEffectiveLon(destLoc);

        LocationStock destStock = stockRepository.findByItemIdAndLocationId(itemId, destinationLocationId)
                .orElse(new LocationStock(itemId, destinationLocationId, 0));
        int currentDestStock = destStock.getQuantity();

        List<StockLocation> allLocations = locationRepository.findAll();
        List<LocationStock> allStocks = stockRepository.findAll();

        Map<UUID, Integer> locationStockMap = new HashMap<>();
        for (LocationStock ls : allStocks) {
            if (ls.getItemId().equals(itemId)) {
                locationStockMap.put(ls.getLocationId(), ls.getQuantity());
            }
        }

        List<CandidateLocation> candidates = new ArrayList<>();
        for (StockLocation loc : allLocations) {
            if (loc.getId().equals(destinationLocationId)) continue;
            int stock = locationStockMap.getOrDefault(loc.getId(), 0);
            if (stock > 0) {
                double lat = getEffectiveLat(loc);
                double lon = getEffectiveLon(loc);
                double distanceMeters = calculateHaversineDistance(destLat, destLon, lat, lon);
                candidates.add(new CandidateLocation(loc, stock, lat, lon, distanceMeters));
            }
        }

        candidates.sort(Comparator.comparingDouble(c -> c.distanceMeters));

        RefillOptionDTO option1 = buildExpressOption(candidates, neededQuantity, destLat, destLon, destLoc.getName());
        RefillOptionDTO option2 = buildWalkingEmergencyOption(candidates, neededQuantity, destLat, destLon, destLoc.getName());
        RefillOptionDTO option3 = buildMultiStopOption(candidates, neededQuantity, destLat, destLon, destLoc.getName());

        return new RefillOptimizerResponse(
                destLoc.getId(),
                destLoc.getName(),
                item.getId(),
                item.getName(),
                item.getUnit(),
                neededQuantity,
                currentDestStock,
                option1,
                option2,
                option3
        );
    }

    private RefillOptionDTO buildExpressOption(List<CandidateLocation> candidates, int neededQuantity,
                                               double destLat, double destLon, String destName) {
        CandidateLocation bestFullMatch = candidates.stream()
                .filter(c -> c.stock >= neededQuantity)
                .findFirst()
                .orElse(null);

        CandidateLocation chosen = bestFullMatch != null ? bestFullMatch : (candidates.isEmpty() ? null : candidates.get(0));

        if (chosen == null) {
            return createEmptyOption("EXPRESS", "Express Complet", neededQuantity, "Nicio locație cu stoc disponibil.");
        }

        int fulfilled = Math.min(neededQuantity, chosen.stock);
        RefillStepDTO step = createStep(chosen, fulfilled, destLat, destLon, destName);

        String summary = (fulfilled >= neededQuantity)
                ? "Reaprovizionare completă dintr-o singură cursă rapidă."
                : "Cea mai apropiată locație disponibilă (stoc parțial).";

        return new RefillOptionDTO(
                "EXPRESS",
                "Express Complet",
                fulfilled,
                neededQuantity,
                Math.round(((double) fulfilled / neededQuantity) * 100.0 * 10.0) / 10.0,
                fulfilled >= neededQuantity,
                step.getDistanceMeters(),
                step.getDistanceFormatted(),
                step.getTransitMinutes(),
                formatTime(step.getTransitMinutes(), step.getTransitMode(), step.getDistanceFormatted()),
                step.getTransitMode(),
                List.of(step),
                summary
        );
    }

    private RefillOptionDTO buildWalkingEmergencyOption(List<CandidateLocation> candidates, int neededQuantity,
                                                        double destLat, double destLon, String destName) {
        CandidateLocation chosen = candidates.stream()
                .filter(c -> c.distanceMeters <= 1200.0)
                .findFirst()
                .orElse(candidates.isEmpty() ? null : candidates.get(0));

        if (chosen == null) {
            return createEmptyOption("WALKING_EMERGENCY", "Urgență pe Jos", neededQuantity, "Nicio locație în apropiere.");
        }

        int fulfilled = Math.min(neededQuantity, chosen.stock);
        RefillStepDTO step = createStep(chosen, fulfilled, destLat, destLon, destName);
        step.setTransitMode("WALK");
        step.setTransitMinutes(Math.max(1, (int) Math.round(step.getDistanceMeters() / 75.0)));

        String summary = "Cea mai rapidă deplasare pietonală pentru intervenție imediată.";

        return new RefillOptionDTO(
                "WALKING_EMERGENCY",
                "Urgență pe Jos",
                fulfilled,
                neededQuantity,
                Math.round(((double) fulfilled / neededQuantity) * 100.0 * 10.0) / 10.0,
                fulfilled >= neededQuantity,
                step.getDistanceMeters(),
                step.getDistanceFormatted(),
                step.getTransitMinutes(),
                formatTime(step.getTransitMinutes(), "WALK", step.getDistanceFormatted()),
                "WALK",
                List.of(step),
                summary
        );
    }

    private RefillOptionDTO buildMultiStopOption(List<CandidateLocation> candidates, int neededQuantity,
                                                 double destLat, double destLon, String destName) {
        if (candidates.isEmpty()) {
            return createEmptyOption("MULTI_STOP", "Combinat Multi-Locație", neededQuantity, "Nicio locație disponibilă.");
        }

        List<RefillStepDTO> steps = new ArrayList<>();
        int remainingNeeded = neededQuantity;
        double totalDist = 0.0;
        int totalMins = 0;

        for (CandidateLocation c : candidates) {
            if (remainingNeeded <= 0) break;
            int take = Math.min(remainingNeeded, c.stock);
            RefillStepDTO step = createStep(c, take, destLat, destLon, destName);
            steps.add(step);
            remainingNeeded -= take;
            totalDist += step.getDistanceMeters();
            totalMins += step.getTransitMinutes();
        }

        int totalFulfilled = neededQuantity - remainingNeeded;
        String mode = (totalDist <= 1500.0) ? "WALK" : "DRIVE";
        String distFormatted = formatDistance(totalDist);

        String summary = steps.size() > 1
                ? "Traseu multi-stop optimizat (" + steps.size() + " locații)."
                : "Suficient dintr-o singură locație combinată.";

        return new RefillOptionDTO(
                "MULTI_STOP",
                "Combinat Multi-Locație",
                totalFulfilled,
                neededQuantity,
                Math.round(((double) totalFulfilled / neededQuantity) * 100.0 * 10.0) / 10.0,
                totalFulfilled >= neededQuantity,
                Math.round(totalDist),
                distFormatted,
                totalMins,
                formatTime(totalMins, mode, distFormatted),
                mode,
                steps,
                summary
        );
    }

    private RefillOptionDTO createEmptyOption(String code, String name, int needed, String notes) {
        return new RefillOptionDTO(
                code, name, 0, needed, 0.0, false, 0.0, "0 m", 0, "-", "WALK", Collections.emptyList(), notes
        );
    }

    private RefillStepDTO createStep(CandidateLocation cand, int quantityToPickup, double destLat, double destLon, String destName) {
        String preferredMode = (cand.distanceMeters <= 1200.0) ? "WALK" : "DRIVE";
        GoogleMapsRoutingService.RouteResult route = googleMapsRoutingService.computeRoute(cand.lat, cand.lon, destLat, destLon, preferredMode);
        String mode = route.getTransitMode();
        int mins = route.getDurationMinutes();

        String navUrl = String.format(Locale.US,
                "https://www.google.com/maps/dir/?api=1&origin=%f,%f&destination=%f,%f",
                cand.lat, cand.lon, destLat, destLon
        );

        return new RefillStepDTO(
                cand.location.getId(),
                cand.location.getName(),
                cand.location.getType(),
                cand.location.getAddress(),
                cand.lat,
                cand.lon,
                quantityToPickup,
                cand.stock,
                cand.distanceMeters,
                formatDistance(cand.distanceMeters),
                mins,
                mode,
                navUrl
        );
    }

    private String formatDistance(double meters) {
        if (meters < 1000.0) {
            return Math.round(meters) + " m";
        }
        return (Math.round((meters / 1000.0) * 10.0) / 10.0) + " km";
    }

    private String formatTime(int minutes, String mode, String distFormatted) {
        String modeLabel = "WALK".equalsIgnoreCase(mode) ? "pe jos" : "cu mașina";
        return "~" + minutes + " min " + modeLabel + " (" + distFormatted + ")";
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    private double getEffectiveLat(StockLocation loc) {
        if (loc.getLatitude() != null && loc.getLatitude().compareTo(BigDecimal.ZERO) != 0) {
            return loc.getLatitude().doubleValue();
        }
        String name = loc.getName().toLowerCase();
        if (name.contains("unirii")) return 46.7693;
        if (name.contains("muzeului")) return 46.7716;
        if (name.contains("iulius")) return 46.7712;
        if (name.contains("vivo") || name.contains("polus")) return 46.7511;
        if (name.contains("central") || name.contains("depozit")) return 46.7820;
        return DEFAULT_FALLBACK_LAT;
    }

    private double getEffectiveLon(StockLocation loc) {
        if (loc.getLongitude() != null && loc.getLongitude().compareTo(BigDecimal.ZERO) != 0) {
            return loc.getLongitude().doubleValue();
        }
        String name = loc.getName().toLowerCase();
        if (name.contains("unirii")) return 23.5898;
        if (name.contains("muzeului")) return 23.5878;
        if (name.contains("iulius")) return 23.6236;
        if (name.contains("vivo") || name.contains("polus")) return 23.5322;
        if (name.contains("central") || name.contains("depozit")) return 23.6100;
        return DEFAULT_FALLBACK_LON;
    }

    private static class CandidateLocation {
        final StockLocation location;
        final int stock;
        final double lat;
        final double lon;
        final double distanceMeters;

        CandidateLocation(StockLocation location, int stock, double lat, double lon, double distanceMeters) {
            this.location = location;
            this.stock = stock;
            this.lat = lat;
            this.lon = lon;
            this.distanceMeters = distanceMeters;
        }
    }

    private int getStatusScore(String status, boolean isSellable) {
        int base;
        switch (status) {
            case "DEPLETED": base = 40; break;
            case "CRITICAL_RUNOUT": base = 30; break;
            case "WARNING_LOW": base = 20; break;
            default: base = 10; break;
        }
        return base + (isSellable ? 5 : 0);
    }

    @Transactional
    public StockItem updateItemThresholds(UUID itemId, UpdateItemThresholdsRequest req) {
        StockItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        if (req.getMinSafetyStock() != null) item.setMinSafetyStock(req.getMinSafetyStock());
        if (req.getLeadTimeDays() != null) item.setLeadTimeDays(req.getLeadTimeDays());
        if (req.getTargetStock() != null) item.setTargetStock(req.getTargetStock());
        if (req.getDailyBurnRate() != null) item.setDailyBurnRate(req.getDailyBurnRate());

        return itemRepository.save(item);
    }
}
