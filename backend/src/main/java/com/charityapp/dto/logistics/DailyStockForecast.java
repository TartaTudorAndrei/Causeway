package com.charityapp.dto.logistics;

public class DailyStockForecast {
    private String date; // YYYY-MM-DD
    private String dayOfWeek; // Mon, Tue, etc.
    private double dayWeight; // e.g. 1.6
    private double eventMultiplier; // e.g. 2.5
    private String specialEventTitle;
    private String specialEventTag;
    private double weatherMultiplier = 1.0;
    private String weatherCondition = "NORMAL";
    private Double tempMax;
    private Double tempMin;
    private int activeStandsCount;
    private int totalScheduledShifts;
    private double projectedDemand;
    private int projectedStockRemaining;
    private boolean isRunoutDay;

    public DailyStockForecast() {}

    public DailyStockForecast(String date, String dayOfWeek, double dayWeight, double eventMultiplier,
                              String specialEventTitle, String specialEventTag,
                              double weatherMultiplier, String weatherCondition, Double tempMax, Double tempMin,
                              int activeStandsCount, int totalScheduledShifts,
                              double projectedDemand, int projectedStockRemaining, boolean isRunoutDay) {
        this.date = date;
        this.dayOfWeek = dayOfWeek;
        this.dayWeight = dayWeight;
        this.eventMultiplier = eventMultiplier;
        this.specialEventTitle = specialEventTitle;
        this.specialEventTag = specialEventTag;
        this.weatherMultiplier = weatherMultiplier;
        this.weatherCondition = weatherCondition;
        this.tempMax = tempMax;
        this.tempMin = tempMin;
        this.activeStandsCount = activeStandsCount;
        this.totalScheduledShifts = totalScheduledShifts;
        this.projectedDemand = projectedDemand;
        this.projectedStockRemaining = projectedStockRemaining;
        this.isRunoutDay = isRunoutDay;
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public double getDayWeight() { return dayWeight; }
    public void setDayWeight(double dayWeight) { this.dayWeight = dayWeight; }

    public double getEventMultiplier() { return eventMultiplier; }
    public void setEventMultiplier(double eventMultiplier) { this.eventMultiplier = eventMultiplier; }

    public String getSpecialEventTitle() { return specialEventTitle; }
    public void setSpecialEventTitle(String specialEventTitle) { this.specialEventTitle = specialEventTitle; }

    public String getSpecialEventTag() { return specialEventTag; }
    public void setSpecialEventTag(String specialEventTag) { this.specialEventTag = specialEventTag; }

    public double getWeatherMultiplier() { return weatherMultiplier; }
    public void setWeatherMultiplier(double weatherMultiplier) { this.weatherMultiplier = weatherMultiplier; }

    public String getWeatherCondition() { return weatherCondition; }
    public void setWeatherCondition(String weatherCondition) { this.weatherCondition = weatherCondition; }

    public Double getTempMax() { return tempMax; }
    public void setTempMax(Double tempMax) { this.tempMax = tempMax; }

    public Double getTempMin() { return tempMin; }
    public void setTempMin(Double tempMin) { this.tempMin = tempMin; }

    public int getActiveStandsCount() { return activeStandsCount; }
    public void setActiveStandsCount(int activeStandsCount) { this.activeStandsCount = activeStandsCount; }

    public int getTotalScheduledShifts() { return totalScheduledShifts; }
    public void setTotalScheduledShifts(int totalScheduledShifts) { this.totalScheduledShifts = totalScheduledShifts; }

    public double getProjectedDemand() { return projectedDemand; }
    public void setProjectedDemand(double projectedDemand) { this.projectedDemand = projectedDemand; }

    public int getProjectedStockRemaining() { return projectedStockRemaining; }
    public void setProjectedStockRemaining(int projectedStockRemaining) { this.projectedStockRemaining = projectedStockRemaining; }

    public boolean isRunoutDay() { return isRunoutDay; }
    public void setRunoutDay(boolean runoutDay) { isRunoutDay = runoutDay; }
}
