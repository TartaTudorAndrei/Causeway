package com.charityapp.dto.logistics;

import java.util.List;
import java.util.UUID;

public class RefillOptionDTO {
    private String strategyCode; // EXPRESS, WALKING_EMERGENCY, MULTI_STOP
    private String strategyName; // Express Complet, Urgenta pe Jos, Combinat Multi-Locatie
    private int totalFulfilledQuantity;
    private int requestedQuantity;
    private double fulfillmentPercentage;
    private boolean isFullFulfillment;
    private double totalDistanceMeters;
    private String totalDistanceFormatted;
    private int totalTransitMinutes;
    private String totalTimeFormatted; // ~4 min pe jos (350m) or ~11 min cu masina (2.4 km)
    private String primaryTransitMode; // WALK, DRIVE
    private List<RefillStepDTO> steps;
    private String summaryNotes;

    public RefillOptionDTO() {}

    public RefillOptionDTO(String strategyCode, String strategyName, int totalFulfilledQuantity,
                           int requestedQuantity, double fulfillmentPercentage, boolean isFullFulfillment,
                           double totalDistanceMeters, String totalDistanceFormatted,
                           int totalTransitMinutes, String totalTimeFormatted,
                           String primaryTransitMode, List<RefillStepDTO> steps, String summaryNotes) {
        this.strategyCode = strategyCode;
        this.strategyName = strategyName;
        this.totalFulfilledQuantity = totalFulfilledQuantity;
        this.requestedQuantity = requestedQuantity;
        this.fulfillmentPercentage = fulfillmentPercentage;
        this.isFullFulfillment = isFullFulfillment;
        this.totalDistanceMeters = totalDistanceMeters;
        this.totalDistanceFormatted = totalDistanceFormatted;
        this.totalTransitMinutes = totalTransitMinutes;
        this.totalTimeFormatted = totalTimeFormatted;
        this.primaryTransitMode = primaryTransitMode;
        this.steps = steps;
        this.summaryNotes = summaryNotes;
    }

    public String getStrategyCode() { return strategyCode; }
    public void setStrategyCode(String strategyCode) { this.strategyCode = strategyCode; }
    public String getStrategyName() { return strategyName; }
    public void setStrategyName(String strategyName) { this.strategyName = strategyName; }
    public int getTotalFulfilledQuantity() { return totalFulfilledQuantity; }
    public void setTotalFulfilledQuantity(int totalFulfilledQuantity) { this.totalFulfilledQuantity = totalFulfilledQuantity; }
    public int getRequestedQuantity() { return requestedQuantity; }
    public void setRequestedQuantity(int requestedQuantity) { this.requestedQuantity = requestedQuantity; }
    public double getFulfillmentPercentage() { return fulfillmentPercentage; }
    public void setFulfillmentPercentage(double fulfillmentPercentage) { this.fulfillmentPercentage = fulfillmentPercentage; }
    public boolean isFullFulfillment() { return isFullFulfillment; }
    public void setFullFulfillment(boolean fullFulfillment) { isFullFulfillment = fullFulfillment; }
    public double getTotalDistanceMeters() { return totalDistanceMeters; }
    public void setTotalDistanceMeters(double totalDistanceMeters) { this.totalDistanceMeters = totalDistanceMeters; }
    public String getTotalDistanceFormatted() { return totalDistanceFormatted; }
    public void setTotalDistanceFormatted(String totalDistanceFormatted) { this.totalDistanceFormatted = totalDistanceFormatted; }
    public int getTotalTransitMinutes() { return totalTransitMinutes; }
    public void setTotalTransitMinutes(int totalTransitMinutes) { this.totalTransitMinutes = totalTransitMinutes; }
    public String getTotalTimeFormatted() { return totalTimeFormatted; }
    public void setTotalTimeFormatted(String totalTimeFormatted) { this.totalTimeFormatted = totalTimeFormatted; }
    public String getPrimaryTransitMode() { return primaryTransitMode; }
    public void setPrimaryTransitMode(String primaryTransitMode) { this.primaryTransitMode = primaryTransitMode; }
    public List<RefillStepDTO> getSteps() { return steps; }
    public void setSteps(List<RefillStepDTO> steps) { this.steps = steps; }
    public String getSummaryNotes() { return summaryNotes; }
    public void setSummaryNotes(String summaryNotes) { this.summaryNotes = summaryNotes; }
}
