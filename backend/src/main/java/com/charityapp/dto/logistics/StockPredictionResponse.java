package com.charityapp.dto.logistics;

import java.util.List;

public class StockPredictionResponse {
    private List<ItemPredictionDetail> predictions;
    private int criticalItemsCount;
    private int warningItemsCount;
    private int healthyItemsCount;
    private List<SpecialDemandEventDTO> upcomingSpecialEvents;

    public StockPredictionResponse() {}

    public StockPredictionResponse(List<ItemPredictionDetail> predictions,
                                   int criticalItemsCount,
                                   int warningItemsCount,
                                   int healthyItemsCount,
                                   List<SpecialDemandEventDTO> upcomingSpecialEvents) {
        this.predictions = predictions;
        this.criticalItemsCount = criticalItemsCount;
        this.warningItemsCount = warningItemsCount;
        this.healthyItemsCount = healthyItemsCount;
        this.upcomingSpecialEvents = upcomingSpecialEvents;
    }

    public List<ItemPredictionDetail> getPredictions() { return predictions; }
    public void setPredictions(List<ItemPredictionDetail> predictions) { this.predictions = predictions; }

    public int getCriticalItemsCount() { return criticalItemsCount; }
    public void setCriticalItemsCount(int criticalItemsCount) { this.criticalItemsCount = criticalItemsCount; }

    public int getWarningItemsCount() { return warningItemsCount; }
    public void setWarningItemsCount(int warningItemsCount) { this.warningItemsCount = warningItemsCount; }

    public int getHealthyItemsCount() { return healthyItemsCount; }
    public void setHealthyItemsCount(int healthyItemsCount) { this.healthyItemsCount = healthyItemsCount; }

    public List<SpecialDemandEventDTO> getUpcomingSpecialEvents() { return upcomingSpecialEvents; }
    public void setUpcomingSpecialEvents(List<SpecialDemandEventDTO> upcomingSpecialEvents) { this.upcomingSpecialEvents = upcomingSpecialEvents; }

    public static class SpecialDemandEventDTO {
        private String id;
        private String title;
        private String date;
        private String time;
        private double demandMultiplier;
        private String demandTag;

        public SpecialDemandEventDTO() {}

        public SpecialDemandEventDTO(String id, String title, String date, String time, double demandMultiplier, String demandTag) {
            this.id = id;
            this.title = title;
            this.date = date;
            this.time = time;
            this.demandMultiplier = demandMultiplier;
            this.demandTag = demandTag;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }
        public double getDemandMultiplier() { return demandMultiplier; }
        public void setDemandMultiplier(double demandMultiplier) { this.demandMultiplier = demandMultiplier; }
        public String getDemandTag() { return demandTag; }
        public void setDemandTag(String demandTag) { this.demandTag = demandTag; }
    }
}
