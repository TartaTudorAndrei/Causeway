package com.charityapp.dto.logistics;

import java.util.UUID;

public class StandDispatchItemDetail {
    private UUID itemId;
    private String itemName;
    private String sku;
    private String category;
    private String unit;
    private boolean isSellable;
    private int currentStandStock;
    private double baseBurnRatePerShift;
    private double forecastedDemand;
    private int safetyBuffer;
    private int suggestedPackQuantity;

    public StandDispatchItemDetail() {}

    public StandDispatchItemDetail(UUID itemId, String itemName, String sku, String category,
                                   String unit, boolean isSellable, int currentStandStock,
                                   double baseBurnRatePerShift, double forecastedDemand,
                                   int safetyBuffer, int suggestedPackQuantity) {
        this.itemId = itemId;
        this.itemName = itemName;
        this.sku = sku;
        this.category = category;
        this.unit = unit;
        this.isSellable = isSellable;
        this.currentStandStock = currentStandStock;
        this.baseBurnRatePerShift = baseBurnRatePerShift;
        this.forecastedDemand = forecastedDemand;
        this.safetyBuffer = safetyBuffer;
        this.suggestedPackQuantity = suggestedPackQuantity;
    }

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
    public void setSellable(boolean sellable) { isSellable = sellable; }

    @com.fasterxml.jackson.annotation.JsonProperty("isMug")
    public boolean isMug() { return isSellable; }
    public void setMug(boolean mug) { isSellable = mug; }

    public int getCurrentStandStock() { return currentStandStock; }
    public void setCurrentStandStock(int currentStandStock) { this.currentStandStock = currentStandStock; }

    public double getBaseBurnRatePerShift() { return baseBurnRatePerShift; }
    public void setBaseBurnRatePerShift(double baseBurnRatePerShift) { this.baseBurnRatePerShift = baseBurnRatePerShift; }

    public double getForecastedDemand() { return forecastedDemand; }
    public void setForecastedDemand(double forecastedDemand) { this.forecastedDemand = forecastedDemand; }

    public int getSafetyBuffer() { return safetyBuffer; }
    public void setSafetyBuffer(int safetyBuffer) { this.safetyBuffer = safetyBuffer; }

    public int getSuggestedPackQuantity() { return suggestedPackQuantity; }
    public void setSuggestedPackQuantity(int suggestedPackQuantity) { this.suggestedPackQuantity = suggestedPackQuantity; }
}
