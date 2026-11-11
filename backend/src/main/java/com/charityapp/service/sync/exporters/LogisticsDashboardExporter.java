package com.charityapp.service.sync.exporters;

import com.charityapp.model.logistics.LocationStock;
import com.charityapp.model.logistics.StockAdjustment;
import com.charityapp.model.logistics.StockItem;
import com.charityapp.model.logistics.StockLocation;
import com.charityapp.repository.logistics.LocationStockRepository;
import com.charityapp.repository.logistics.StockItemRepository;
import com.charityapp.repository.logistics.StockLocationRepository;
import com.charityapp.service.logistics.LogisticsService;
import com.charityapp.service.sync.DashboardExportable;
import com.charityapp.service.sync.MultiTabDashboardExportable;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class LogisticsDashboardExporter implements MultiTabDashboardExportable {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final StockItemRepository itemRepository;
    private final StockLocationRepository locationRepository;
    private final LocationStockRepository stockRepository;
    private final LogisticsService logisticsService;

    public LogisticsDashboardExporter(StockItemRepository itemRepository,
                                      StockLocationRepository locationRepository,
                                      LocationStockRepository stockRepository,
                                      LogisticsService logisticsService) {
        this.itemRepository = itemRepository;
        this.locationRepository = locationRepository;
        this.stockRepository = stockRepository;
        this.logisticsService = logisticsService;
    }

    @Override
    public List<DashboardExportable> getTabs() {
        return List.of(
            getInventoryTab(),
            getLocationStockTab(),
            getTransfersTab(),
            getAdjustmentsTab(),
            getEoDReportsTab()
        );
    }

    private DashboardExportable getInventoryTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Logistics_Inventory"; }
            @Override
            public String getDomain() { return "LOGISTICS"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Item Name", "Category", "Unit", "Merchandise / Mug", "Total Stock On Hand", "Notes");
            }
            @Override
            public List<List<Object>> getRows() {
                List<StockItem> items = itemRepository.findAll();
                List<LocationStock> stocks = stockRepository.findAll();
                Map<UUID, Integer> itemTotalStockMap = stocks.stream()
                        .collect(Collectors.groupingBy(LocationStock::getItemId, Collectors.summingInt(LocationStock::getQuantity)));
                
                List<List<Object>> inventoryRows = new ArrayList<>();
                for (StockItem itm : items) {
                    inventoryRows.add(List.of(
                            itm.getName() != null ? itm.getName() : "",
                            itm.getCategory() != null ? itm.getCategory() : "General",
                            itm.getUnit() != null ? itm.getUnit() : "buc",
                            itm.isMug() ? "YES" : "NO",
                            itemTotalStockMap.getOrDefault(itm.getId(), 0),
                            itm.getNotes() != null ? itm.getNotes() : ""
                    ));
                }
                return inventoryRows;
            }
        };
    }

    private DashboardExportable getLocationStockTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Logistics_Location_Stock"; }
            @Override
            public String getDomain() { return "LOGISTICS"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Location Name", "Location Type", "Item Name", "Category", "Quantity In Stock", "Unit");
            }
            @Override
            public List<List<Object>> getRows() {
                List<StockItem> items = itemRepository.findAll();
                List<StockLocation> locations = locationRepository.findAll();
                List<LocationStock> stocks = stockRepository.findAll();

                Map<UUID, String> locationNameMap = locations.stream()
                        .collect(Collectors.toMap(StockLocation::getId, StockLocation::getName, (a, b) -> a));
                Map<UUID, String> locationTypeMap = locations.stream()
                        .collect(Collectors.toMap(StockLocation::getId, l -> l.getType() != null ? l.getType() : "DEPOSIT", (a, b) -> a));
                Map<UUID, StockItem> itemEntityMap = items.stream()
                        .collect(Collectors.toMap(StockItem::getId, i -> i, (a, b) -> a));

                List<List<Object>> locStockRows = new ArrayList<>();
                for (LocationStock ls : stocks) {
                    StockItem itm = itemEntityMap.get(ls.getItemId());
                    locStockRows.add(List.of(
                            locationNameMap.getOrDefault(ls.getLocationId(), "Locație"),
                            locationTypeMap.getOrDefault(ls.getLocationId(), "DEPOSIT"),
                            itm != null ? itm.getName() : "Articol",
                            itm != null && itm.getCategory() != null ? itm.getCategory() : "General",
                            ls.getQuantity(),
                            itm != null && itm.getUnit() != null ? itm.getUnit() : "buc"
                    ));
                }
                return locStockRows;
            }
        };
    }

    private DashboardExportable getTransfersTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Logistics_Transfers"; }
            @Override
            public String getDomain() { return "LOGISTICS"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Timestamp", "Source Location", "Destination Location", "Items Transferred", "Performed By", "Notes");
            }
            @Override
            public List<List<Object>> getRows() {
                List<com.charityapp.dto.logistics.StockTransferResponse> transfers = logisticsService.getTransfers();
                List<List<Object>> transferRows = new ArrayList<>();
                for (var trf : transfers) {
                    String itemsSummary = trf.getItems() != null
                            ? trf.getItems().stream().map(i -> i.getItemName() + ": " + i.getQuantity() + " " + i.getUnit()).collect(Collectors.joining(", "))
                            : "";
                    transferRows.add(List.of(
                            trf.getTimestamp() != null ? trf.getTimestamp().format(DATE_TIME_FORMATTER) : "",
                            trf.getSourceLocationName() != null ? trf.getSourceLocationName() : "",
                            trf.getDestinationLocationName() != null ? trf.getDestinationLocationName() : "",
                            itemsSummary,
                            trf.getPerformedBy() != null ? trf.getPerformedBy() : "",
                            trf.getNotes() != null ? trf.getNotes() : ""
                    ));
                }
                return transferRows;
            }
        };
    }

    private DashboardExportable getAdjustmentsTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Logistics_Adjustments"; }
            @Override
            public String getDomain() { return "LOGISTICS"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Timestamp", "Item Name", "Location", "Prev Quantity", "New Quantity", "Change (+/-)", "Reason", "Operator", "Notes");
            }
            @Override
            public List<List<Object>> getRows() {
                List<StockItem> items = itemRepository.findAll();
                List<StockLocation> locations = locationRepository.findAll();
                List<StockAdjustment> adjustments = logisticsService.getAdjustments();

                Map<UUID, String> locationNameMap = locations.stream()
                        .collect(Collectors.toMap(StockLocation::getId, StockLocation::getName, (a, b) -> a));
                Map<UUID, StockItem> itemEntityMap = items.stream()
                        .collect(Collectors.toMap(StockItem::getId, i -> i, (a, b) -> a));

                List<List<Object>> adjRows = new ArrayList<>();
                for (StockAdjustment a : adjustments) {
                    StockItem itm = itemEntityMap.get(a.getItemId());
                    adjRows.add(List.of(
                            a.getTimestamp() != null ? a.getTimestamp().format(DATE_TIME_FORMATTER) : "",
                            itm != null ? itm.getName() : "Articol",
                            locationNameMap.getOrDefault(a.getLocationId(), "Locație"),
                            a.getPreviousQuantity(),
                            a.getNewQuantity(),
                            a.getQuantityChange(),
                            a.getReason() != null ? a.getReason() : "",
                            a.getPerformedBy() != null ? a.getPerformedBy() : "",
                            a.getNotes() != null ? a.getNotes() : ""
                    ));
                }
                return adjRows;
            }
        };
    }

    private DashboardExportable getEoDReportsTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Logistics_EoD_Reports"; }
            @Override
            public String getDomain() { return "LOGISTICS"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Closed At", "Stand Name", "Closing Responsible", "Mugs Remaining Breakdown", "Notes");
            }
            @Override
            public List<List<Object>> getRows() {
                List<com.charityapp.dto.logistics.LogisticsEoDResponse> eodReports = logisticsService.getEoDReports();
                List<List<Object>> eodRows = new ArrayList<>();
                for (var eod : eodReports) {
                    String mugsSummary = eod.getMugCounts() != null
                            ? eod.getMugCounts().stream().map(m -> m.getItemName() + ": " + m.getCountRemaining() + " buc").collect(Collectors.joining(", "))
                            : "";
                    eodRows.add(List.of(
                            eod.getClosedAt() != null ? eod.getClosedAt().format(DATE_TIME_FORMATTER) : "",
                            eod.getStandName() != null ? eod.getStandName() : "",
                            eod.getClosingPersonName() != null ? eod.getClosingPersonName() : "",
                            mugsSummary,
                            eod.getNotes() != null ? eod.getNotes() : ""
                    ));
                }
                return eodRows;
            }
        };
    }
}
