package com.charityapp.dto.logistics;

import java.util.List;
import java.util.UUID;

public class StandDispatchPrepResponse {
    private UUID standId;
    private String standName;
    private String locationName;
    private String eventDate;
    private String status;
    private String cadenceCode; // ZILNIC, RECURENT_WEEKEND, SCURTA_DURATA, OCAZIONAL_POPUP
    private String cadenceLabel; // Zilnic, Recurent Weekend, Scurta Durata, Ocazional / Pop-Up
    private int activeShiftsCount;
    private List<ShiftSummaryDTO> shifts;
    private WeatherSummaryDTO weather;
    private List<StandDispatchItemDetail> items;
    private List<CampaignStandOptionDTO> allCampaignStands;

    public StandDispatchPrepResponse() {}

    public static class ShiftSummaryDTO {
        private UUID shiftId;
        private String shiftName;
        private String startTime;
        private String endTime;

        public ShiftSummaryDTO() {}

        public ShiftSummaryDTO(UUID shiftId, String shiftName, String startTime, String endTime) {
            this.shiftId = shiftId;
            this.shiftName = shiftName;
            this.startTime = startTime;
            this.endTime = endTime;
        }

        public UUID getShiftId() { return shiftId; }
        public void setShiftId(UUID shiftId) { this.shiftId = shiftId; }
        public String getShiftName() { return shiftName; }
        public void setShiftName(String shiftName) { this.shiftName = shiftName; }
        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }
        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }
    }

    public static class WeatherSummaryDTO {
        private String date;
        private double tempMax;
        private double tempMin;
        private double multiplier;
        private String conditionCode;
        private String conditionLabel;

        public WeatherSummaryDTO() {}

        public WeatherSummaryDTO(String date, double tempMax, double tempMin, double multiplier, String conditionCode, String conditionLabel) {
            this.date = date;
            this.tempMax = tempMax;
            this.tempMin = tempMin;
            this.multiplier = multiplier;
            this.conditionCode = conditionCode;
            this.conditionLabel = conditionLabel;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public double getTempMax() { return tempMax; }
        public void setTempMax(double tempMax) { this.tempMax = tempMax; }
        public double getTempMin() { return tempMin; }
        public void setTempMin(double tempMin) { this.tempMin = tempMin; }
        public double getMultiplier() { return multiplier; }
        public void setMultiplier(double multiplier) { this.multiplier = multiplier; }
        public String getConditionCode() { return conditionCode; }
        public void setConditionCode(String conditionCode) { this.conditionCode = conditionCode; }
        public String getConditionLabel() { return conditionLabel; }
        public void setConditionLabel(String conditionLabel) { this.conditionLabel = conditionLabel; }
    }

    public static class CampaignStandOptionDTO {
        private UUID id;
        private String name;
        private String locationName;
        private String eventDate;
        private String status;
        private String cadenceLabel;

        public CampaignStandOptionDTO() {}

        public CampaignStandOptionDTO(UUID id, String name, String locationName, String eventDate, String status, String cadenceLabel) {
            this.id = id;
            this.name = name;
            this.locationName = locationName;
            this.eventDate = eventDate;
            this.status = status;
            this.cadenceLabel = cadenceLabel;
        }

        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getLocationName() { return locationName; }
        public void setLocationName(String locationName) { this.locationName = locationName; }
        public String getEventDate() { return eventDate; }
        public void setEventDate(String eventDate) { this.eventDate = eventDate; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getCadenceLabel() { return cadenceLabel; }
        public void setCadenceLabel(String cadenceLabel) { this.cadenceLabel = cadenceLabel; }
    }

    public UUID getStandId() { return standId; }
    public void setStandId(UUID standId) { this.standId = standId; }
    public String getStandName() { return standName; }
    public void setStandName(String standName) { this.standName = standName; }
    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }
    public String getEventDate() { return eventDate; }
    public void setEventDate(String eventDate) { this.eventDate = eventDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCadenceCode() { return cadenceCode; }
    public void setCadenceCode(String cadenceCode) { this.cadenceCode = cadenceCode; }
    public String getCadenceLabel() { return cadenceLabel; }
    public void setCadenceLabel(String cadenceLabel) { this.cadenceLabel = cadenceLabel; }
    public int getActiveShiftsCount() { return activeShiftsCount; }
    public void setActiveShiftsCount(int activeShiftsCount) { this.activeShiftsCount = activeShiftsCount; }
    public List<ShiftSummaryDTO> getShifts() { return shifts; }
    public void setShifts(List<ShiftSummaryDTO> shifts) { this.shifts = shifts; }
    public WeatherSummaryDTO getWeather() { return weather; }
    public void setWeather(WeatherSummaryDTO weather) { this.weather = weather; }
    public List<StandDispatchItemDetail> getItems() { return items; }
    public void setItems(List<StandDispatchItemDetail> items) { this.items = items; }
    public List<CampaignStandOptionDTO> getAllCampaignStands() { return allCampaignStands; }
    public void setAllCampaignStands(List<CampaignStandOptionDTO> allCampaignStands) { this.allCampaignStands = allCampaignStands; }
}
