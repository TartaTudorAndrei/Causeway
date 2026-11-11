package com.charityapp.dto.logistics;

public class UpdateItemThresholdsRequest {
    private Integer minSafetyStock;
    private Integer leadTimeDays;
    private Integer targetStock;
    private Double dailyBurnRate;

    public UpdateItemThresholdsRequest() {}

    public UpdateItemThresholdsRequest(Integer minSafetyStock, Integer leadTimeDays, Integer targetStock, Double dailyBurnRate) {
        this.minSafetyStock = minSafetyStock;
        this.leadTimeDays = leadTimeDays;
        this.targetStock = targetStock;
        this.dailyBurnRate = dailyBurnRate;
    }

    public Integer getMinSafetyStock() { return minSafetyStock; }
    public void setMinSafetyStock(Integer minSafetyStock) { this.minSafetyStock = minSafetyStock; }

    public Integer getLeadTimeDays() { return leadTimeDays; }
    public void setLeadTimeDays(Integer leadTimeDays) { this.leadTimeDays = leadTimeDays; }

    public Integer getTargetStock() { return targetStock; }
    public void setTargetStock(Integer targetStock) { this.targetStock = targetStock; }

    public Double getDailyBurnRate() { return dailyBurnRate; }
    public void setDailyBurnRate(Double dailyBurnRate) { this.dailyBurnRate = dailyBurnRate; }
}
