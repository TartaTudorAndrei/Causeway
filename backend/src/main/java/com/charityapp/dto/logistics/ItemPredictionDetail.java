package com.charityapp.dto.logistics;

import java.util.List;
import java.util.UUID;

public class ItemPredictionDetail {
    private UUID itemId;
    private String itemName;
    private String sku;
    private String category;
    private String unit;
    @com.fasterxml.jackson.annotation.JsonProperty("isSellable")
    @com.fasterxml.jackson.annotation.JsonAlias({"isMug", "sellable", "mug"})
    private boolean isSellable;
    private int totalCurrentStock;
    private double baseDailyBurnRate;
    private int minSafetyStock;
    private int leadTimeDays;
    private int targetStock;
    private double reorderPoint;
    private double daysRemaining;
    private String projectedRunoutDate; // YYYY-MM-DD or null if healthy / infinite
    private String status; // CRITICAL_RUNOUT, WARNING_LOW, HEALTHY, DEPLETED
    private boolean willRunOutDuringPeakEvent;
    private String depletingEventName;
    private int recommendedRestockQuantity;
    private List<DailyStockForecast> dailyForecast;

    public ItemPredictionDetail() {}

    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    @com.fasterxml.jackson.annotation.JsonProperty("isSellable")
    public boolean isSellable() { return isSellable; }
    public void setSellable(boolean sellable) { this.isSellable = sellable; }

    @com.fasterxml.jackson.annotation.JsonProperty("isMug")
    public boolean isMug() { return isSellable; }
    public void setMug(boolean mug) { this.isSellable = mug; }

    public int getTotalCurrentStock() { return totalCurrentStock; }
    public void setTotalCurrentStock(int totalCurrentStock) { this.totalCurrentStock = totalCurrentStock; }

    public double getBaseDailyBurnRate() { return baseDailyBurnRate; }
    public void setBaseDailyBurnRate(double baseDailyBurnRate) { this.baseDailyBurnRate = baseDailyBurnRate; }

    public int getMinSafetyStock() { return minSafetyStock; }
    public void setMinSafetyStock(int minSafetyStock) { this.minSafetyStock = minSafetyStock; }

    public int getLeadTimeDays() { return leadTimeDays; }
    public void setLeadTimeDays(int leadTimeDays) { this.leadTimeDays = leadTimeDays; }

    public int getTargetStock() { return targetStock; }
    public void setTargetStock(int targetStock) { this.targetStock = targetStock; }

    public double getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(double reorderPoint) { this.reorderPoint = reorderPoint; }

    public double getDaysRemaining() { return daysRemaining; }
    public void setDaysRemaining(double daysRemaining) { this.daysRemaining = daysRemaining; }

    public String getProjectedRunoutDate() { return projectedRunoutDate; }
    public void setProjectedRunoutDate(String projectedRunoutDate) { this.projectedRunoutDate = projectedRunoutDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isWillRunOutDuringPeakEvent() { return willRunOutDuringPeakEvent; }
    public void setWillRunOutDuringPeakEvent(boolean willRunOutDuringPeakEvent) { this.willRunOutDuringPeakEvent = willRunOutDuringPeakEvent; }

    public String getDepletingEventName() { return depletingEventName; }
    public void setDepletingEventName(String depletingEventName) { this.depletingEventName = depletingEventName; }

    public int getRecommendedRestockQuantity() { return recommendedRestockQuantity; }
    public void setRecommendedRestockQuantity(int recommendedRestockQuantity) { this.recommendedRestockQuantity = recommendedRestockQuantity; }

    public List<DailyStockForecast> getDailyForecast() { return dailyForecast; }
    public void setDailyForecast(List<DailyStockForecast> dailyForecast) { this.dailyForecast = dailyForecast; }
}
