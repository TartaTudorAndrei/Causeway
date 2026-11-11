package com.charityapp.service.logistics;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.logistics.TransferRequest;
import com.charityapp.model.logistics.*;
import com.charityapp.repository.logistics.*;
import com.charityapp.event.DashboardDataChangedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class LogisticsService {
    private final StockLocationRepository locationRepository;
    private final StockItemRepository itemRepository;
    private final LocationStockRepository stockRepository;
    private final StockTransferRepository transferRepository;
    private final StockTransferItemRepository transferItemRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final LogisticsEoDReportRepository eodReportRepository;
    private final LogisticsEoDMugCountRepository eodMugCountRepository;
    private final com.charityapp.service.hr.HrService hrService;
    private final ApplicationEventPublisher eventPublisher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.notification.WhatsAppNotificationService whatsAppNotificationService;

    public LogisticsService(
            StockLocationRepository locationRepository,
            StockItemRepository itemRepository,
            LocationStockRepository stockRepository,
            StockTransferRepository transferRepository,
            StockTransferItemRepository transferItemRepository,
            StockAdjustmentRepository adjustmentRepository,
            LogisticsEoDReportRepository eodReportRepository,
            LogisticsEoDMugCountRepository eodMugCountRepository,
            com.charityapp.service.hr.HrService hrService,
            ApplicationEventPublisher eventPublisher) {
        this.locationRepository = locationRepository;
        this.itemRepository = itemRepository;
        this.stockRepository = stockRepository;
        this.transferRepository = transferRepository;
        this.transferItemRepository = transferItemRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.eodReportRepository = eodReportRepository;
        this.eodMugCountRepository = eodMugCountRepository;
        this.hrService = hrService;
        this.eventPublisher = eventPublisher;
    }


    public List<StockLocation> getLocations() {
        List<StockLocation> existing = new java.util.ArrayList<>(locationRepository.findAll());
        java.util.Set<String> existingNames = existing.stream()
                .filter(l -> l.getName() != null)
                .map(l -> l.getName().trim().toLowerCase())
                .collect(java.util.stream.Collectors.toSet());

        List<com.charityapp.model.hr.HrStand> hrStands = java.util.Collections.emptyList();
        try {
            hrStands = hrService.getAllStands();
        } catch (Exception ignored) {}

        List<StockLocation> toAdd = new java.util.ArrayList<>();
        for (com.charityapp.model.hr.HrStand stand : hrStands) {
            if (stand.getLocationName() != null && !stand.getLocationName().trim().isEmpty()) {
                String cleanName = stand.getLocationName().trim();
                if (!existingNames.contains(cleanName.toLowerCase())) {
                    StockLocation newLoc = new StockLocation();
                    newLoc.setId(UUID.randomUUID());
                    newLoc.setName(cleanName);
                    newLoc.setCode("STAND-" + newLoc.getId().toString().substring(0, 8).toUpperCase());
                    newLoc.setType("STAND");
                    newLoc.setDescription(stand.getEventName() != null && !stand.getEventName().isBlank() ? stand.getEventName() : "Stand HR");
                    newLoc.setSystem(false);
                    newLoc.setCreatedAt(java.time.LocalDateTime.now());
                    newLoc.setUpdatedAt(java.time.LocalDateTime.now());
                    try {
                        StockLocation saved = locationRepository.save(newLoc);
                        toAdd.add(saved != null ? saved : newLoc);
                    } catch (Exception ignored) {
                        toAdd.add(newLoc);
                    }
                    existingNames.add(cleanName.toLowerCase());
                }
            }
        }

        existing.addAll(toAdd);
        return existing;
    }

    public StockLocation createLocation(StockLocation location) {
        if (location == null) {
            throw new IllegalArgumentException("Location cannot be null");
        }
        if (location.getName() == null || location.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Numele locației este obligatoriu");
        }
        String cleanName = location.getName().trim();
        if (locationRepository.existsByNameIgnoreCase(cleanName)) {
            throw new IllegalArgumentException("O locație cu acest nume există deja");
        }
        location.setName(cleanName);

        if (location.getId() == null) {
            location.setId(UUID.randomUUID());
        }
        if (location.getCode() == null || location.getCode().trim().isEmpty()) {
            location.setCode("LOC-" + location.getId().toString().substring(0, 8).toUpperCase());
        } else {
            location.setCode(location.getCode().trim());
        }
        if (location.getType() == null || location.getType().trim().isEmpty()) {
            location.setType("DEPOSIT");
        } else {
            String normType = location.getType().trim().toUpperCase();
            location.setType("STAND".equals(normType) ? "STAND" : "DEPOSIT");
        }
        if (location.getCreatedAt() == null) {
            location.setCreatedAt(java.time.LocalDateTime.now());
        }
        if (location.getUpdatedAt() == null) {
            location.setUpdatedAt(java.time.LocalDateTime.now());
        }
        StockLocation saved = locationRepository.save(location);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "createLocation"));
        return saved;
    }

    @Transactional
    public StockLocation updateLocation(UUID id, StockLocation updatedLocation) {
        StockLocation existing = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Locația nu a fost găsită"));

        if (updatedLocation.getName() != null && !updatedLocation.getName().trim().isEmpty()) {
            String cleanName = updatedLocation.getName().trim();
            if (!cleanName.equalsIgnoreCase(existing.getName()) && locationRepository.existsByNameIgnoreCase(cleanName)) {
                throw new IllegalArgumentException("O locație cu acest nume există deja");
            }
            existing.setName(cleanName);
        }
        if (updatedLocation.getDescription() != null) {
            existing.setDescription(updatedLocation.getDescription().trim());
        }
        if (updatedLocation.getType() != null && !updatedLocation.getType().trim().isEmpty()) {
            String normType = updatedLocation.getType().trim().toUpperCase();
            existing.setType("STAND".equals(normType) ? "STAND" : "DEPOSIT");
        }
        existing.setUpdatedAt(java.time.LocalDateTime.now());
        StockLocation saved = locationRepository.save(existing);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "updateLocation"));
        return saved;
    }

    @Transactional
    public void deleteLocation(UUID id) {
        StockLocation loc = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Locația nu a fost găsită"));

        // Check if assigned to stands
        long standCount = hrService.getAllStands().stream()
                .filter(s -> s.getLocationName() != null && s.getLocationName().equalsIgnoreCase(loc.getName()))
                .count();
        if (standCount > 0) {
            throw new IllegalStateException("Nu se poate șterge locația '" + loc.getName() + "': este atribuită la " + standCount + " stand(uri) HR.");
        }

        // Check stock
        boolean hasStock = stockRepository.findAll().stream()
                .anyMatch(s -> s.getLocationId().equals(id) && s.getQuantity() > 0);
        if (hasStock) {
            throw new IllegalStateException("Nu se poate șterge locația '" + loc.getName() + "': conține stocuri active în depozit/stand.");
        }

        // Check transfers
        boolean hasTransfers = transferRepository.findAll().stream()
                .anyMatch(t -> id.equals(t.getSourceLocationId()) || id.equals(t.getDestinationLocationId()));
        if (hasTransfers) {
            throw new IllegalStateException("Nu se poate șterge locația '" + loc.getName() + "': este utilizată în transferuri de stoc.");
        }

        try {
            stockRepository.deleteByLocationId(id);
        } catch (Exception ignored) {}

        locationRepository.deleteById(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "deleteLocation"));
    }

    public List<StockItem> getItems() {
        return itemRepository.findAll();
    }

    public StockItem createItem(StockItem item) {
        StockItem saved = itemRepository.save(item);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "createItem"));
        return saved;
    }

    @Transactional
    public StockItem updateItem(UUID itemId, StockItem updatedItem) {
        StockItem existing = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Articolul nu a fost găsit"));

        if (updatedItem.getName() != null && !updatedItem.getName().trim().isEmpty()) {
            existing.setName(updatedItem.getName().trim());
        }
        if (updatedItem.getCategory() != null) {
            existing.setCategory(updatedItem.getCategory().trim());
        }
        if (updatedItem.getUnit() != null) {
            existing.setUnit(updatedItem.getUnit().trim());
        }
        if (updatedItem.getNotes() != null) {
            existing.setNotes(updatedItem.getNotes().trim());
        }
        if (updatedItem.getPhotoUrl() != null) {
            existing.setPhotoUrl(updatedItem.getPhotoUrl().trim());
        }
        if (updatedItem.getRawIsSellable() != null) {
            existing.setIsSellable(updatedItem.getRawIsSellable());
        } else if (updatedItem.getRawIsMug() != null) {
            existing.setIsSellable(updatedItem.getRawIsMug());
        }
        StockItem saved = itemRepository.save(existing);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "updateItem"));
        return saved;
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        if (!itemRepository.existsById(itemId)) {
            throw new IllegalArgumentException("Item not found");
        }
        itemRepository.deleteById(itemId);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "deleteItem"));
    }

    public List<LocationStock> getStocks() {
        return stockRepository.findAll();
    }

    public List<com.charityapp.dto.logistics.StockTransferResponse> getTransfers() {
        List<StockTransfer> transfers = transferRepository.findAllByOrderByTimestampDesc();
        List<StockLocation> locations = locationRepository.findAll();
        List<StockItem> items = itemRepository.findAll();

        java.util.Map<UUID, String> locMap = locations.stream()
                .collect(java.util.stream.Collectors.toMap(StockLocation::getId, StockLocation::getName, (a, b) -> a));
        java.util.Map<UUID, StockItem> itemMap = items.stream()
                .collect(java.util.stream.Collectors.toMap(StockItem::getId, itm -> itm, (a, b) -> a));

        List<com.charityapp.dto.logistics.StockTransferResponse> response = new java.util.ArrayList<>();
        for (StockTransfer trf : transfers) {
            List<StockTransferItem> trfItems = transferItemRepository.findByTransferId(trf.getId());
            List<com.charityapp.dto.logistics.StockTransferResponse.TransferItemDetail> itemDetails = new java.util.ArrayList<>();

            for (StockTransferItem ti : trfItems) {
                StockItem itm = itemMap.get(ti.getItemId());
                itemDetails.add(new com.charityapp.dto.logistics.StockTransferResponse.TransferItemDetail(
                        ti.getItemId(),
                        itm != null ? itm.getName() : "Articol",
                        ti.getQuantity(),
                        itm != null ? itm.getUnit() : "buc"
                ));
            }

            response.add(new com.charityapp.dto.logistics.StockTransferResponse(
                    trf.getId(),
                    trf.getSourceLocationId(),
                    locMap.getOrDefault(trf.getSourceLocationId(), "Sursă"),
                    trf.getDestinationLocationId(),
                    locMap.getOrDefault(trf.getDestinationLocationId(), "Destinație"),
                    itemDetails,
                    trf.getTimestamp(),
                    trf.getPerformedBy(),
                    trf.getNotes()
            ));
        }

        return response;
    }

    public List<StockAdjustment> getAdjustments() {
        return adjustmentRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional
    public StockAdjustment adjustStock(com.charityapp.dto.logistics.StockAdjustmentRequest request) {
        if (request.getItemId() == null) {
            throw new IllegalArgumentException("Item ID is required for stock adjustment.");
        }
        if (request.getLocationId() == null) {
            throw new IllegalArgumentException("Location ID is required for stock adjustment.");
        }
        if (request.getNewQuantity() == null || request.getNewQuantity() < 0) {
            throw new IllegalArgumentException("New quantity must be non-negative.");
        }

        StockItem item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));
        StockLocation location = locationRepository.findById(request.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));

        LocationStock locationStock = stockRepository.findByItemIdAndLocationId(request.getItemId(), request.getLocationId())
                .orElseGet(() -> new LocationStock(request.getItemId(), request.getLocationId(), 0));

        int prevQty = locationStock.getQuantity();
        int newQty = request.getNewQuantity();
        int change = newQty - prevQty;

        locationStock.setQuantity(newQty);
        stockRepository.save(locationStock);

        StockAdjustment adjustment = new StockAdjustment(
                request.getItemId(),
                request.getLocationId(),
                prevQty,
                newQty,
                change,
                request.getReason() != null && !request.getReason().isBlank() ? request.getReason() : "MANUAL_ADJUSTMENT",
                request.getNotes(),
                request.getPerformedBy() != null && !request.getPerformedBy().isBlank() ? request.getPerformedBy() : "Operator"
        );

        StockAdjustment savedAdjustment = adjustmentRepository.save(adjustment);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "adjustStock"));

        if (whatsAppNotificationService != null && item.getMinSafetyStock() > 0 && newQty <= item.getMinSafetyStock()) {
            try {
                whatsAppNotificationService.sendLogisticsLowStockAlert(
                        item.getName(),
                        newQty,
                        item.getMinSafetyStock(),
                        item.getUnit(),
                        location.getName()
                );
            } catch (Exception ignored) {}
        }

        return savedAdjustment;
    }

    @Transactional
    public StockTransfer executeTransfer(TransferRequest request) {
        if (request.getSourceLocationId().equals(request.getDestinationLocationId())) {
            throw new IllegalArgumentException("Source and destination locations cannot be identical.");
        }

        StockLocation source = locationRepository.findById(request.getSourceLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Source location not found"));
        StockLocation dest = locationRepository.findById(request.getDestinationLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Destination location not found"));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Transfer must contain at least one item.");
        }

        // Validate stock availability
        for (TransferRequest.ItemQuantity iq : request.getItems()) {
            if (iq.getQuantity() <= 0) continue;
            LocationStock srcStock = stockRepository.findByItemIdAndLocationId(iq.getItemId(), source.getId())
                    .orElse(new LocationStock(iq.getItemId(), source.getId(), 0));
            if (srcStock.getQuantity() < iq.getQuantity()) {
                StockItem item = itemRepository.findById(iq.getItemId()).orElse(null);
                String itemName = item != null ? item.getName() : iq.getItemId().toString();
                throw new IllegalArgumentException("Insufficient stock for item '" + itemName + "' at " + source.getName());
            }
        }

        // Apply transfer changes
        StockTransfer transfer = new StockTransfer(
                source.getId(),
                dest.getId(),
                request.getPerformedBy() != null ? request.getPerformedBy() : "Operator",
                request.getNotes()
        );
        transfer = transferRepository.save(transfer);

        for (TransferRequest.ItemQuantity iq : request.getItems()) {
            if (iq.getQuantity() <= 0) continue;

            // Decrement source
            LocationStock srcStock = stockRepository.findByItemIdAndLocationId(iq.getItemId(), source.getId())
                    .orElseGet(() -> new LocationStock(iq.getItemId(), source.getId(), 0));
            int remainingSrcQty = srcStock.getQuantity() - iq.getQuantity();
            srcStock.setQuantity(remainingSrcQty);
            stockRepository.save(srcStock);

            // Increment destination
            LocationStock destStock = stockRepository.findByItemIdAndLocationId(iq.getItemId(), dest.getId())
                    .orElseGet(() -> new LocationStock(iq.getItemId(), dest.getId(), 0));
            destStock.setQuantity(destStock.getQuantity() + iq.getQuantity());
            stockRepository.save(destStock);

            // Save transfer line item
            StockTransferItem transferItem = new StockTransferItem(transfer.getId(), iq.getItemId(), iq.getQuantity());
            transferItemRepository.save(transferItem);

            // Low stock alert check for source location
            if (whatsAppNotificationService != null) {
                StockItem item = itemRepository.findById(iq.getItemId()).orElse(null);
                if (item != null && item.getMinSafetyStock() > 0 && remainingSrcQty <= item.getMinSafetyStock()) {
                    try {
                        whatsAppNotificationService.sendLogisticsLowStockAlert(
                                item.getName(),
                                remainingSrcQty,
                                item.getMinSafetyStock(),
                                item.getUnit(),
                                source.getName()
                        );
                    } catch (Exception ignored) {}
                }
            }
        }

        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "executeTransfer"));
        return transfer;
    }


    public List<com.charityapp.dto.logistics.LogisticsEoDResponse> getEoDReports() {
        List<LogisticsEoDReport> reports = eodReportRepository.findAllByOrderByClosedAtDesc();
        List<com.charityapp.dto.logistics.LogisticsEoDResponse> response = new java.util.ArrayList<>();

        for (LogisticsEoDReport report : reports) {
            List<LogisticsEoDMugCount> mugCounts = eodMugCountRepository.findByEodReportId(report.getId());
            List<com.charityapp.dto.logistics.LogisticsEoDResponse.MugCountDetail> mugDetails = new java.util.ArrayList<>();
            for (LogisticsEoDMugCount mc : mugCounts) {
                mugDetails.add(new com.charityapp.dto.logistics.LogisticsEoDResponse.MugCountDetail(
                        mc.getId(),
                        mc.getItemId(),
                        mc.getItemName(),
                        mc.getCountRemaining()
                ));
            }

            response.add(new com.charityapp.dto.logistics.LogisticsEoDResponse(
                    report.getId(),
                    report.getStandId(),
                    report.getStandName(),
                    report.getClosingPersonName(),
                    report.getClosedAt(),
                    report.getNotes(),
                    mugDetails
            ));
        }

        return response;
    }

    public java.util.Set<UUID> getStandLocationIds(UUID standId, String standName) {
        java.util.Set<UUID> targetLocIds = new java.util.HashSet<>();
        if (standId != null) {
            targetLocIds.add(standId);
        }

        com.charityapp.model.hr.HrStand matchedHrStand = null;
        if (standId != null) {
            try {
                matchedHrStand = hrService.getAllStands().stream()
                        .filter(s -> standId.equals(s.getId()))
                        .findFirst()
                        .orElse(null);
            } catch (Exception ignored) {}
        }
        if (matchedHrStand == null && standName != null) {
            try {
                matchedHrStand = hrService.getAllStands().stream()
                        .filter(s -> s.getLocationName() != null && standName.toLowerCase().contains(s.getLocationName().toLowerCase()))
                        .findFirst()
                        .orElse(null);
            } catch (Exception ignored) {}
        }

        if (matchedHrStand != null && matchedHrStand.getId() != null) {
            targetLocIds.add(matchedHrStand.getId());
        }

        String locationName = matchedHrStand != null ? matchedHrStand.getLocationName() : standName;
        List<StockLocation> locations = locationRepository.findAll();
        for (StockLocation loc : locations) {
            if (loc.getId().equals(standId)
                    || (matchedHrStand != null && loc.getId().equals(matchedHrStand.getId()))
                    || (locationName != null && loc.getName() != null && loc.getName().trim().equalsIgnoreCase(locationName.trim()))
                    || (locationName != null && loc.getName() != null && loc.getName().toLowerCase().contains(locationName.toLowerCase()))
                    || (locationName != null && loc.getName() != null && locationName.toLowerCase().contains(loc.getName().toLowerCase()))) {
                targetLocIds.add(loc.getId());
            }
        }
        return targetLocIds;
    }

    public java.util.Map<UUID, Integer> getStandSuppliedItemCounts(UUID standId, String standName) {
        java.util.Set<UUID> targetLocIds = getStandLocationIds(standId, standName);

        List<StockTransfer> transfers = transferRepository.findAll();
        List<StockTransferItem> allTransferItems = transferItemRepository.findAll();
        java.util.Map<UUID, List<StockTransferItem>> transferItemsByTransfer = allTransferItems.stream()
                .collect(java.util.stream.Collectors.groupingBy(StockTransferItem::getTransferId));

        java.util.Map<UUID, Integer> totalInMap = new java.util.HashMap<>();
        java.util.Map<UUID, Integer> totalOutMap = new java.util.HashMap<>();

        for (StockTransfer t : transfers) {
            if (targetLocIds.contains(t.getDestinationLocationId())) {
                List<StockTransferItem> tiList = transferItemsByTransfer.getOrDefault(t.getId(), java.util.Collections.emptyList());
                for (StockTransferItem ti : tiList) {
                    totalInMap.put(ti.getItemId(), totalInMap.getOrDefault(ti.getItemId(), 0) + ti.getQuantity());
                }
            }
            if (targetLocIds.contains(t.getSourceLocationId())) {
                List<StockTransferItem> tiList = transferItemsByTransfer.getOrDefault(t.getId(), java.util.Collections.emptyList());
                for (StockTransferItem ti : tiList) {
                    totalOutMap.put(ti.getItemId(), totalOutMap.getOrDefault(ti.getItemId(), 0) + ti.getQuantity());
                }
            }
        }

        List<LocationStock> stocks = stockRepository.findAll();
        java.util.Map<UUID, Integer> directStockMap = new java.util.HashMap<>();
        for (LocationStock s : stocks) {
            if (targetLocIds.contains(s.getLocationId())) {
                directStockMap.put(s.getItemId(), directStockMap.getOrDefault(s.getItemId(), 0) + s.getQuantity());
            }
        }

        java.util.Set<UUID> allItemIds = new java.util.HashSet<>();
        allItemIds.addAll(totalInMap.keySet());
        allItemIds.addAll(directStockMap.keySet());

        java.util.Map<UUID, Integer> suppliedMap = new java.util.HashMap<>();
        for (UUID itmId : allItemIds) {
            int netTransferred = Math.max(0, totalInMap.getOrDefault(itmId, 0) - totalOutMap.getOrDefault(itmId, 0));
            int directStock = directStockMap.getOrDefault(itmId, 0);
            suppliedMap.put(itmId, Math.max(netTransferred, directStock));
        }

        return suppliedMap;
    }

    @Transactional
    public com.charityapp.dto.logistics.LogisticsEoDResponse submitEoDReport(com.charityapp.dto.logistics.LogisticsEoDSubmitRequest request) {
        if (request.getStandName() == null || request.getStandName().isBlank()) {
            throw new IllegalArgumentException("Stand name is required.");
        }
        if (request.getClosingPersonName() == null || request.getClosingPersonName().isBlank()) {
            throw new IllegalArgumentException("Closing person name is required.");
        }

        if (request.getStandId() != null && eodReportRepository.existsByStandId(request.getStandId())) {
            throw new IllegalStateException("Stand has already been closed for End of Day.");
        }

        if (request.getStandId() != null) {
            try {
                com.charityapp.model.hr.HrStand stand = hrService.getAllStands().stream()
                        .filter(s -> request.getStandId().equals(s.getId()))
                        .findFirst()
                        .orElse(null);
                if (stand != null && stand.getEventDate() != null) {
                    java.time.LocalDate eventDate = stand.getEventDate();
                    java.time.LocalTime earliestShiftTime = java.time.LocalTime.MIN;
                    if (stand.getShifts() != null && !stand.getShifts().isEmpty()) {
                        java.time.LocalTime minTime = null;
                        for (com.charityapp.model.hr.HrShift shift : stand.getShifts()) {
                            if (shift.getStartTime() != null && !shift.getStartTime().isBlank()) {
                                try {
                                    String st = shift.getStartTime().trim();
                                    if (st.length() == 5) st += ":00";
                                    java.time.LocalTime t = java.time.LocalTime.parse(st);
                                    if (minTime == null || t.isBefore(minTime)) {
                                        minTime = t;
                                    }
                                } catch (Exception ignored) {}
                            }
                        }
                        if (minTime != null) {
                            earliestShiftTime = minTime;
                        }
                    }
                    java.time.LocalDateTime earliestStart = eventDate.atTime(earliestShiftTime);
                    if (java.time.LocalDateTime.now().isBefore(earliestStart)) {
                        throw new IllegalStateException("Standul nu a început încă. Încheierea poate avea loc doar după începerea primului schimb.");
                    }
                }
            } catch (IllegalStateException e) {
                throw e;
            } catch (Exception ignored) {}
        }

        java.util.Set<UUID> targetLocIds = getStandLocationIds(request.getStandId(), request.getStandName());

        if (request.getMugCounts() != null) {
            for (com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem mc : request.getMugCounts()) {
                if (mc.getItemId() == null) continue;
                if (mc.getCountRemaining() < 0) {
                    throw new IllegalArgumentException("Numărul de căni rămase nu poate fi negativ.");
                }
            }
        }

        LogisticsEoDReport report = new LogisticsEoDReport(
                UUID.randomUUID(),
                request.getStandId(),
                request.getStandName(),
                request.getClosingPersonName(),
                request.getNotes()
        );
        report = eodReportRepository.save(report);

        List<com.charityapp.dto.logistics.LogisticsEoDResponse.MugCountDetail> mugDetails = new java.util.ArrayList<>();
        if (request.getMugCounts() != null) {
            for (com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem mc : request.getMugCounts()) {
                if (mc.getItemId() == null) continue;
                LogisticsEoDMugCount mugCount = new LogisticsEoDMugCount(
                        UUID.randomUUID(),
                        report.getId(),
                        mc.getItemId(),
                        mc.getItemName() != null ? mc.getItemName() : "Cană",
                        Math.max(0, mc.getCountRemaining())
                );
                eodMugCountRepository.save(mugCount);

                mugDetails.add(new com.charityapp.dto.logistics.LogisticsEoDResponse.MugCountDetail(
                        mugCount.getId(),
                        mugCount.getItemId(),
                        mugCount.getItemName(),
                        mugCount.getCountRemaining()
                ));

                // Reconcile stand location stock with the remaining count
                int newQty = Math.max(0, mc.getCountRemaining());
                for (UUID locId : targetLocIds) {
                    if (!locationRepository.existsById(locId)) continue;
                    LocationStock locStock = stockRepository.findByItemIdAndLocationId(mc.getItemId(), locId)
                            .orElseGet(() -> new LocationStock(mc.getItemId(), locId, 0));
                    int prevQty = locStock.getQuantity();
                    locStock.setQuantity(newQty);
                    stockRepository.save(locStock);

                    if (prevQty != newQty) {
                        StockAdjustment adjustment = new StockAdjustment(
                                mc.getItemId(),
                                locId,
                                prevQty,
                                newQty,
                                newQty - prevQty,
                                "EOD_RECONCILIATION",
                                "Încheiere stand EoD de către " + request.getClosingPersonName(),
                                request.getClosingPersonName()
                        );
                        adjustmentRepository.save(adjustment);
                    }
                }
            }
        }

        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "submitEoDReport"));

        if (whatsAppNotificationService != null) {
            try {
                int totalMugs = 0;
                if (request.getMugCounts() != null) {
                    totalMugs = request.getMugCounts().stream()
                            .mapToInt(mc -> Math.max(0, mc.getCountRemaining()))
                            .sum();
                }
                whatsAppNotificationService.sendLogisticsEoDCompletionAlert(
                        request.getStandName(),
                        request.getClosingPersonName(),
                        request.getNotes(),
                        totalMugs
                );
            } catch (Exception ignored) {}
        }

        return new com.charityapp.dto.logistics.LogisticsEoDResponse(
                report.getId(),
                report.getStandId(),
                report.getStandName(),
                report.getClosingPersonName(),
                report.getClosedAt(),
                report.getNotes(),
                mugDetails
        );
    }

    @Transactional
    public com.charityapp.dto.logistics.LogisticsEoDResponse updateEoDReport(UUID reportId, com.charityapp.dto.logistics.LogisticsEoDSubmitRequest request) {
        LogisticsEoDReport report = eodReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("EoD report not found with id: " + reportId));

        if (request.getStandName() != null && !request.getStandName().isBlank()) {
            report.setStandName(request.getStandName());
        }
        if (request.getClosingPersonName() != null && !request.getClosingPersonName().isBlank()) {
            report.setClosingPersonName(request.getClosingPersonName());
        }
        report.setNotes(request.getNotes());
        if (request.getStandId() != null && !request.getStandId().equals(report.getStandId())) {
            report.setStandId(request.getStandId());
        }

        UUID effectiveStandId = request.getStandId() != null ? request.getStandId() : report.getStandId();
        String effectiveStandName = request.getStandName() != null ? request.getStandName() : report.getStandName();

        java.util.Set<UUID> targetLocIds = getStandLocationIds(effectiveStandId, effectiveStandName);

        if (request.getMugCounts() != null) {
            for (com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem mc : request.getMugCounts()) {
                if (mc.getItemId() == null) continue;
                if (mc.getCountRemaining() < 0) {
                    throw new IllegalArgumentException("Numărul de căni rămase nu poate fi negativ.");
                }
            }
        }

        report = eodReportRepository.save(report);

        List<LogisticsEoDMugCount> existingCounts = eodMugCountRepository.findByEodReportId(reportId);
        eodMugCountRepository.deleteAll(existingCounts);

        List<com.charityapp.dto.logistics.LogisticsEoDResponse.MugCountDetail> mugDetails = new java.util.ArrayList<>();
        if (request.getMugCounts() != null) {
            for (com.charityapp.dto.logistics.LogisticsEoDSubmitRequest.MugCountItem mc : request.getMugCounts()) {
                if (mc.getItemId() == null) continue;
                LogisticsEoDMugCount mugCount = new LogisticsEoDMugCount(
                        UUID.randomUUID(),
                        report.getId(),
                        mc.getItemId(),
                        mc.getItemName() != null ? mc.getItemName() : "Cană",
                        Math.max(0, mc.getCountRemaining())
                );
                eodMugCountRepository.save(mugCount);

                mugDetails.add(new com.charityapp.dto.logistics.LogisticsEoDResponse.MugCountDetail(
                        mugCount.getId(),
                        mugCount.getItemId(),
                        mugCount.getItemName(),
                        mugCount.getCountRemaining()
                ));

                // Reconcile stand location stock with updated count
                int newQty = Math.max(0, mc.getCountRemaining());
                for (UUID locId : targetLocIds) {
                    if (!locationRepository.existsById(locId)) continue;
                    LocationStock locStock = stockRepository.findByItemIdAndLocationId(mc.getItemId(), locId)
                            .orElseGet(() -> new LocationStock(mc.getItemId(), locId, 0));
                    int prevQty = locStock.getQuantity();
                    locStock.setQuantity(newQty);
                    stockRepository.save(locStock);

                    if (prevQty != newQty) {
                        StockAdjustment adjustment = new StockAdjustment(
                                mc.getItemId(),
                                locId,
                                prevQty,
                                newQty,
                                newQty - prevQty,
                                "EOD_RECONCILIATION",
                                "Actualizare raport EoD de către " + request.getClosingPersonName(),
                                request.getClosingPersonName()
                        );
                        adjustmentRepository.save(adjustment);
                    }
                }
            }
        }

        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "updateEoDReport"));
        return new com.charityapp.dto.logistics.LogisticsEoDResponse(
                report.getId(),
                report.getStandId(),
                report.getStandName(),
                report.getClosingPersonName(),
                report.getClosedAt(),
                report.getNotes(),
                mugDetails
        );
    }

    @Transactional
    public void deleteEoDReport(UUID reportId) {
        LogisticsEoDReport report = eodReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("EoD report not found with id: " + reportId));

        java.util.Set<UUID> targetLocIds = getStandLocationIds(report.getStandId(), report.getStandName());
        java.util.Map<UUID, Integer> suppliedMap = getStandSuppliedItemCounts(report.getStandId(), report.getStandName());

        List<LogisticsEoDMugCount> mugCounts = eodMugCountRepository.findByEodReportId(reportId);
        for (UUID locId : targetLocIds) {
            if (!locationRepository.existsById(locId)) continue;
            for (LogisticsEoDMugCount mc : mugCounts) {
                LocationStock locStock = stockRepository.findByItemIdAndLocationId(mc.getItemId(), locId)
                        .orElseGet(() -> new LocationStock(mc.getItemId(), locId, 0));
                int prevQty = locStock.getQuantity();
                int restoredQty = suppliedMap.getOrDefault(mc.getItemId(), 0);
                locStock.setQuantity(restoredQty);
                stockRepository.save(locStock);

                if (prevQty != restoredQty) {
                    StockAdjustment adjustment = new StockAdjustment(
                            mc.getItemId(),
                            locId,
                            prevQty,
                            restoredQty,
                            restoredQty - prevQty,
                            "EOD_REOPEN",
                            "Redeschidere stand / anulare raport EoD",
                            "System"
                    );
                    adjustmentRepository.save(adjustment);
                }
            }
        }

        eodMugCountRepository.deleteAll(mugCounts);
        eodReportRepository.deleteById(reportId);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Logistics", "deleteEoDReport"));
    }

    public List<com.charityapp.dto.logistics.StandStatisticsResponse> getStandStatistics() {
        List<LogisticsEoDReport> eodReports = eodReportRepository.findAllByOrderByClosedAtDesc();
        if (eodReports.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<com.charityapp.model.hr.HrStand> hrStands = java.util.Collections.emptyList();
        try {
            hrStands = hrService.getAllStands();
        } catch (Exception ignored) {}

        List<StockLocation> locations = locationRepository.findAll();
        List<StockItem> items = itemRepository.findAll();
        List<LocationStock> stocks = stockRepository.findAll();
        List<StockTransfer> transfers = transferRepository.findAllByOrderByTimestampAsc();

        java.util.Map<UUID, StockLocation> locationMap = locations.stream()
                .collect(java.util.stream.Collectors.toMap(StockLocation::getId, l -> l, (a, b) -> a));
        java.util.Map<UUID, StockItem> itemMap = items.stream()
                .collect(java.util.stream.Collectors.toMap(StockItem::getId, i -> i, (a, b) -> a));

        java.util.Map<UUID, List<StockTransferItem>> transferItemsByTransfer = transferItemRepository.findAll().stream()
                .collect(java.util.stream.Collectors.groupingBy(StockTransferItem::getTransferId));

        java.util.Map<UUID, List<LogisticsEoDMugCount>> eodMugCountsByReport = eodMugCountRepository.findAll().stream()
                .collect(java.util.stream.Collectors.groupingBy(LogisticsEoDMugCount::getEodReportId));

        java.util.Map<String, Integer> stockByLocAndItem = stocks.stream()
                .collect(java.util.stream.Collectors.toMap(s -> s.getLocationId() + ":" + s.getItemId(), LocationStock::getQuantity, (a, b) -> b));

        List<com.charityapp.dto.logistics.StandStatisticsResponse> responses = new java.util.ArrayList<>();

        // Stand Statistics ONLY includes stands that have completed an End of Day report
        for (LogisticsEoDReport report : eodReports) {
            com.charityapp.model.hr.HrStand matchedHrStand = null;
            if (report.getStandId() != null) {
                matchedHrStand = hrStands.stream()
                        .filter(s -> report.getStandId().equals(s.getId()))
                        .findFirst()
                        .orElse(null);
            }

            String locationName = matchedHrStand != null && matchedHrStand.getLocationName() != null
                    ? matchedHrStand.getLocationName()
                    : (report.getStandName() != null ? report.getStandName() : "Stand");

            String eventName = matchedHrStand != null && matchedHrStand.getEventName() != null
                    ? matchedHrStand.getEventName()
                    : "Eveniment";

            java.time.LocalDate eventDate = matchedHrStand != null && matchedHrStand.getEventDate() != null
                    ? matchedHrStand.getEventDate()
                    : (report.getClosedAt() != null ? report.getClosedAt().toLocalDate() : java.time.LocalDate.now());

            String standDisplayName = locationName + (eventDate != null ? " (" + eventDate + ")" : "");

            java.util.Set<UUID> targetLocIds = new java.util.HashSet<>();
            if (report.getStandId() != null) targetLocIds.add(report.getStandId());
            if (matchedHrStand != null && matchedHrStand.getId() != null) targetLocIds.add(matchedHrStand.getId());

            for (StockLocation loc : locations) {
                if ((report.getStandId() != null && loc.getId().equals(report.getStandId()))
                        || (matchedHrStand != null && loc.getId().equals(matchedHrStand.getId()))
                        || (loc.getName() != null && loc.getName().trim().equalsIgnoreCase(locationName.trim()))
                        || (loc.getName() != null && loc.getName().toLowerCase().contains(locationName.toLowerCase()))
                        || (loc.getName() != null && locationName.toLowerCase().contains(loc.getName().toLowerCase()))) {
                    targetLocIds.add(loc.getId());
                }
            }

            com.charityapp.dto.logistics.StandStatisticsResponse standStat = computeSingleStandStats(
                    report.getStandId() != null ? report.getStandId() : report.getId(),
                    standDisplayName,
                    locationName,
                    eventName,
                    eventDate,
                    "COMPLETED",
                    targetLocIds,
                    report,
                    transfers,
                    transferItemsByTransfer,
                    eodMugCountsByReport,
                    stockByLocAndItem,
                    items,
                    itemMap,
                    locationMap
            );
            responses.add(standStat);
        }

        return responses;
    }

    private com.charityapp.dto.logistics.StandStatisticsResponse computeSingleStandStats(
            UUID standId,
            String standName,
            String locationName,
            String eventName,
            java.time.LocalDate eventDate,
            String status,
            java.util.Set<UUID> targetLocIds,
            LogisticsEoDReport eodReport,
            List<StockTransfer> allTransfers,
            java.util.Map<UUID, List<StockTransferItem>> transferItemsByTransfer,
            java.util.Map<UUID, List<LogisticsEoDMugCount>> eodMugCountsByReport,
            java.util.Map<String, Integer> stockByLocAndItem,
            List<StockItem> allItems,
            java.util.Map<UUID, StockItem> itemMap,
            java.util.Map<UUID, StockLocation> locationMap
    ) {
        com.charityapp.dto.logistics.StandStatisticsResponse resp = new com.charityapp.dto.logistics.StandStatisticsResponse();
        resp.setStandId(standId);
        resp.setStandName(standName != null ? standName : "Stand");
        resp.setLocationName(locationName != null ? locationName : "Stand");
        resp.setEventName(eventName);
        resp.setEventDate(eventDate);
        resp.setStatus(status != null ? status : (eodReport != null ? "COMPLETED" : "ACTIVE"));
        resp.setClosed(eodReport != null);

        if (eodReport != null) {
            resp.setEodReportId(eodReport.getId());
            resp.setClosedAt(eodReport.getClosedAt());
            resp.setClosingPersonName(eodReport.getClosingPersonName());
            resp.setClosingNotes(eodReport.getNotes());
        }

        List<StockTransfer> relevantTransfers = allTransfers.stream()
                .filter(t -> targetLocIds.contains(t.getDestinationLocationId()) || targetLocIds.contains(t.getSourceLocationId()))
                .collect(java.util.stream.Collectors.toList());

        List<StockTransfer> inboundTransfers = relevantTransfers.stream()
                .filter(t -> targetLocIds.contains(t.getDestinationLocationId()))
                .collect(java.util.stream.Collectors.toList());

        List<StockTransfer> outboundTransfers = relevantTransfers.stream()
                .filter(t -> targetLocIds.contains(t.getSourceLocationId()))
                .collect(java.util.stream.Collectors.toList());

        java.util.Map<UUID, Integer> openedMap = new java.util.HashMap<>();
        java.util.Map<UUID, Integer> restockedMap = new java.util.HashMap<>();
        java.util.Map<UUID, Integer> totalInMap = new java.util.HashMap<>();
        java.util.Map<UUID, Integer> transferredOutMap = new java.util.HashMap<>();

        for (int i = 0; i < inboundTransfers.size(); i++) {
            StockTransfer trf = inboundTransfers.get(i);
            List<StockTransferItem> itemsList = transferItemsByTransfer.getOrDefault(trf.getId(), java.util.Collections.emptyList());
            for (StockTransferItem ti : itemsList) {
                UUID itmId = ti.getItemId();
                int qty = ti.getQuantity();
                totalInMap.put(itmId, totalInMap.getOrDefault(itmId, 0) + qty);

                if (i == 0 || !openedMap.containsKey(itmId)) {
                    openedMap.put(itmId, openedMap.getOrDefault(itmId, 0) + qty);
                } else {
                    restockedMap.put(itmId, restockedMap.getOrDefault(itmId, 0) + qty);
                }
            }
        }

        for (StockTransfer trf : outboundTransfers) {
            List<StockTransferItem> itemsList = transferItemsByTransfer.getOrDefault(trf.getId(), java.util.Collections.emptyList());
            for (StockTransferItem ti : itemsList) {
                UUID itmId = ti.getItemId();
                int qty = ti.getQuantity();
                transferredOutMap.put(itmId, transferredOutMap.getOrDefault(itmId, 0) + qty);
            }
        }

        java.util.Map<UUID, Integer> endedMap = new java.util.HashMap<>();
        if (eodReport != null) {
            List<LogisticsEoDMugCount> mugCounts = eodMugCountsByReport.getOrDefault(eodReport.getId(), java.util.Collections.emptyList());
            for (LogisticsEoDMugCount mc : mugCounts) {
                endedMap.put(mc.getItemId(), mc.getCountRemaining());
            }
        } else {
            for (StockItem itm : allItems) {
                int curr = 0;
                for (UUID locId : targetLocIds) {
                    curr += stockByLocAndItem.getOrDefault(locId + ":" + itm.getId(), 0);
                }
                endedMap.put(itm.getId(), curr);
            }
        }

        List<com.charityapp.dto.logistics.StandStatisticsResponse.StandItemStat> itemStats = new java.util.ArrayList<>();
        int totalMugsOpened = 0;
        int totalMugsRestocked = 0;
        int totalMugsIn = 0;
        int totalMugsOut = 0;
        int totalMugsSupplied = 0;
        int totalMugsEnded = 0;
        int totalMugsSold = 0;

        for (StockItem item : allItems) {
            boolean isMug = item.isMug() || item.isSellable();

            int directStock = 0;
            for (UUID locId : targetLocIds) {
                directStock += stockByLocAndItem.getOrDefault(locId + ":" + item.getId(), 0);
            }

            int opened = openedMap.getOrDefault(item.getId(), 0);
            int restocked = restockedMap.getOrDefault(item.getId(), 0);
            int totIn = totalInMap.getOrDefault(item.getId(), 0);
            int trfOut = transferredOutMap.getOrDefault(item.getId(), 0);
            int ended = endedMap.getOrDefault(item.getId(), 0);

            int netTransferred = Math.max(0, totIn - trfOut);
            int netSupplied = Math.max(netTransferred, Math.max(directStock, ended));

            if (totIn == 0 && netSupplied > 0) {
                opened = Math.max(0, netSupplied - restocked);
            }

            int sold = Math.max(0, netSupplied - ended);
            double sellThrough = netSupplied > 0 ? (sold * 100.0 / netSupplied) : 0.0;

            if (isMug || totIn > 0 || trfOut > 0 || ended > 0 || directStock > 0) {
                com.charityapp.dto.logistics.StandStatisticsResponse.StandItemStat stat =
                        new com.charityapp.dto.logistics.StandStatisticsResponse.StandItemStat(
                                item.getId(),
                                item.getName(),
                                item.getSku(),
                                item.getCategory(),
                                item.getUnit(),
                                isMug,
                                opened,
                                restocked,
                                totIn,
                                trfOut,
                                netSupplied,
                                ended,
                                sold,
                                Math.round(sellThrough * 10.0) / 10.0
                        );
                itemStats.add(stat);
            }

            if (isMug) {
                totalMugsOpened += opened;
                totalMugsRestocked += restocked;
                totalMugsIn += totIn;
                totalMugsOut += trfOut;
                totalMugsSupplied += netSupplied;
                totalMugsEnded += ended;
                totalMugsSold += sold;
            }
        }

        resp.setItemStats(itemStats);
        resp.setTotalMugsOpened(totalMugsOpened);
        resp.setTotalMugsRestocked(totalMugsRestocked);
        resp.setTotalMugsTransferredIn(totalMugsIn);
        resp.setTotalMugsTransferredOut(totalMugsOut);
        resp.setTotalMugsSupplied(totalMugsSupplied);
        resp.setTotalMugsEnded(totalMugsEnded);
        resp.setTotalMugsSold(totalMugsSold);
        resp.setMugSellThroughRate(totalMugsSupplied > 0 ? Math.round((totalMugsSold * 100.0 / totalMugsSupplied) * 10.0) / 10.0 : 0.0);

        List<com.charityapp.dto.logistics.StandStatisticsResponse.StandTransferAudit> transferAudits = new java.util.ArrayList<>();
        for (StockTransfer t : relevantTransfers) {
            boolean isInbound = targetLocIds.contains(t.getDestinationLocationId());
            String direction = isInbound ? "INBOUND" : "OUTBOUND";

            StockLocation srcLoc = locationMap.get(t.getSourceLocationId());
            StockLocation dstLoc = locationMap.get(t.getDestinationLocationId());

            List<StockTransferItem> tiList = transferItemsByTransfer.getOrDefault(t.getId(), java.util.Collections.emptyList());
            List<com.charityapp.dto.logistics.StockTransferResponse.TransferItemDetail> itemDetails = new java.util.ArrayList<>();
            for (StockTransferItem ti : tiList) {
                StockItem itm = itemMap.get(ti.getItemId());
                itemDetails.add(new com.charityapp.dto.logistics.StockTransferResponse.TransferItemDetail(
                        ti.getItemId(),
                        itm != null ? itm.getName() : "Articol",
                        ti.getQuantity(),
                        itm != null ? itm.getUnit() : "buc"
                ));
            }

            transferAudits.add(new com.charityapp.dto.logistics.StandStatisticsResponse.StandTransferAudit(
                    t.getId(),
                    direction,
                    t.getSourceLocationId(),
                    srcLoc != null ? srcLoc.getName() : "Sursă",
                    t.getDestinationLocationId(),
                    dstLoc != null ? dstLoc.getName() : "Destinație",
                    itemDetails,
                    t.getTimestamp(),
                    t.getPerformedBy(),
                    t.getNotes()
            ));
        }

        transferAudits.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        resp.setTransfers(transferAudits);

        return resp;
    }
}


