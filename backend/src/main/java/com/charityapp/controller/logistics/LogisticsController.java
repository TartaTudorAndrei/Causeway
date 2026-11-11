package com.charityapp.controller.logistics;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.logistics.*;
import com.charityapp.model.logistics.*;
import com.charityapp.service.logistics.LogisticsService;
import com.charityapp.service.logistics.StockPredictionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/logistics")
public class LogisticsController {
    private final LogisticsService logisticsService;
    private final StockPredictionService predictionService;

    public LogisticsController(
            LogisticsService logisticsService,
            StockPredictionService predictionService) {
        this.logisticsService = logisticsService;
        this.predictionService = predictionService;
    }

    @GetMapping("/predictions")
    @RequirePermission(code = "logistics:predictions:read", anyOf = {"logistics:inventory:read", "logistics:predictor:view", "logistics:read"})
    public ResponseEntity<StockPredictionResponse> getPredictions() {
        return ResponseEntity.ok(predictionService.getPredictions());
    }

    @GetMapping("/stand-prep")
    @RequirePermission(code = "logistics:predictions:read", anyOf = {"logistics:inventory:read", "logistics:predictor:view", "logistics:read"})
    public ResponseEntity<StandDispatchPrepResponse> getStandDispatchPrep(
            @RequestParam(required = false) UUID standId,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(predictionService.getStandDispatchPrep(standId, date));
    }

    @GetMapping("/refill-optimizer")
    @RequirePermission(code = "logistics:predictions:read", anyOf = {"logistics:inventory:read", "logistics:predictor:view", "logistics:read"})
    public ResponseEntity<RefillOptimizerResponse> calculateRefillOptions(
            @RequestParam UUID destinationLocationId,
            @RequestParam UUID itemId,
            @RequestParam(defaultValue = "50") int neededQuantity) {
        return ResponseEntity.ok(predictionService.calculateRefillOptions(destinationLocationId, itemId, neededQuantity));
    }

    @PutMapping("/items/{id}/thresholds")
    @RequirePermission(code = "logistics:inventory:items:write", anyOf = {"logistics:inventory:write", "logistics:stockeditor:view", "logistics:write"})
    public ResponseEntity<StockItem> updateItemThresholds(
            @PathVariable UUID id,
            @RequestBody UpdateItemThresholdsRequest request) {
        return ResponseEntity.ok(predictionService.updateItemThresholds(id, request));
    }

    @GetMapping("/locations")
    @RequirePermission(code = "logistics:inventory:locations:read", anyOf = {"logistics:inventory:read", "logistics:inventory:view", "logistics:read"})
    public ResponseEntity<List<StockLocation>> getLocations() {
        return ResponseEntity.ok(logisticsService.getLocations());
    }

    @PostMapping("/locations")
    @RequirePermission(code = "logistics:inventory:locations:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<?> createLocation(@RequestBody StockLocation location) {
        try {
            return ResponseEntity.ok(logisticsService.createLocation(location));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/locations/{id}")
    @RequirePermission(code = "logistics:inventory:locations:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<?> updateLocation(@PathVariable UUID id, @RequestBody StockLocation location) {
        try {
            return ResponseEntity.ok(logisticsService.updateLocation(id, location));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/locations/{id}")
    @RequirePermission(code = "logistics:inventory:locations:delete", anyOf = {"logistics:inventory:locations:write", "logistics:inventory:write", "logistics:write"})
    public ResponseEntity<?> deleteLocation(@PathVariable UUID id) {
        try {
            logisticsService.deleteLocation(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/items")
    @RequirePermission(code = "logistics:inventory:items:read", anyOf = {"logistics:inventory:read", "logistics:inventory:view", "logistics:stockeditor:view", "logistics:read"})
    public ResponseEntity<List<StockItem>> getItems() {
        return ResponseEntity.ok(logisticsService.getItems());
    }

    @PostMapping("/items")
    @RequirePermission(code = "logistics:inventory:items:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<StockItem> createItem(@RequestBody StockItem item) {
        return ResponseEntity.ok(logisticsService.createItem(item));
    }

    @PutMapping("/items/{id}")
    @RequirePermission(code = "logistics:inventory:items:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<StockItem> updateItem(@PathVariable UUID id, @RequestBody StockItem item) {
        return ResponseEntity.ok(logisticsService.updateItem(id, item));
    }

    @DeleteMapping("/items/{id}")
    @RequirePermission(code = "logistics:inventory:items:delete", anyOf = {"logistics:inventory:delete", "logistics:inventory:write", "logistics:write"})
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        logisticsService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stocks")
    @RequirePermission(code = "logistics:inventory:stocks:read", anyOf = {"logistics:inventory:read", "logistics:inventory:view", "logistics:read"})
    public ResponseEntity<List<LocationStock>> getStocks() {
        return ResponseEntity.ok(logisticsService.getStocks());
    }

    @GetMapping("/transfers")
    @RequirePermission(code = "logistics:inventory:transfers:read", anyOf = {"logistics:inventory:read", "logistics:history:view", "logistics:read"})
    public ResponseEntity<List<StockTransferResponse>> getTransfers() {
        return ResponseEntity.ok(logisticsService.getTransfers());
    }

    @PostMapping("/transfers")
    @RequirePermission(code = "logistics:inventory:transfers:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<StockTransfer> executeTransfer(@RequestBody TransferRequest request) {
        return ResponseEntity.ok(logisticsService.executeTransfer(request));
    }

    @GetMapping("/adjustments")
    @RequirePermission(code = "logistics:inventory:adjustments:read", anyOf = {"logistics:inventory:read", "logistics:read"})
    public ResponseEntity<List<StockAdjustment>> getAdjustments() {
        return ResponseEntity.ok(logisticsService.getAdjustments());
    }

    @PostMapping("/adjustments")
    @RequirePermission(code = "logistics:inventory:adjustments:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<StockAdjustment> adjustStock(@RequestBody StockAdjustmentRequest request) {
        return ResponseEntity.ok(logisticsService.adjustStock(request));
    }

    @GetMapping("/eod")
    @RequirePermission(code = "logistics:stands:eod:read", anyOf = {"logistics:inventory:read", "logistics:standstats:view", "logistics:read"})
    public ResponseEntity<List<LogisticsEoDResponse>> getEoDReports() {
        return ResponseEntity.ok(logisticsService.getEoDReports());
    }

    @PostMapping("/eod")
    @RequirePermission(code = "logistics:stands:eod:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<?> submitEoDReport(
            @RequestBody LogisticsEoDSubmitRequest request) {
        try {
            return ResponseEntity.ok(logisticsService.submitEoDReport(request));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/eod/{id}")
    @RequirePermission(code = "logistics:stands:eod:write", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<?> updateEoDReport(
            @PathVariable UUID id,
            @RequestBody LogisticsEoDSubmitRequest request) {
        try {
            return ResponseEntity.ok(logisticsService.updateEoDReport(id, request));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/eod/{id}")
    @RequirePermission(code = "logistics:stands:eod:delete", anyOf = {"logistics:inventory:write", "logistics:write"})
    public ResponseEntity<Void> deleteEoDReport(@PathVariable UUID id) {
        logisticsService.deleteEoDReport(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stand-stats")
    @RequirePermission(code = "logistics:stands:stock:read", anyOf = {"logistics:standstats:view", "logistics:inventory:read", "logistics:statistics:view", "logistics:read"})
    public ResponseEntity<List<StandStatisticsResponse>> getStandStatistics() {
        return ResponseEntity.ok(logisticsService.getStandStatistics());
    }
}
