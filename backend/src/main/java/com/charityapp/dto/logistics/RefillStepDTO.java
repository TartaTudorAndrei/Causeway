package com.charityapp.dto.logistics;

import java.util.UUID;

public class RefillStepDTO {
    private UUID sourceLocationId;
    private String sourceLocationName;
    private String sourceLocationType;
    private String address;
    private Double latitude;
    private Double longitude;
    private int quantityToPickup;
    private int stockAvailableAtLocation;
    private double distanceMeters;
    private String distanceFormatted;
    private int transitMinutes;
    private String transitMode; // WALK, DRIVE
    private String navigationUrl;

    public RefillStepDTO() {}

    public RefillStepDTO(UUID sourceLocationId, String sourceLocationName, String sourceLocationType,
                         String address, Double latitude, Double longitude, int quantityToPickup,
                         int stockAvailableAtLocation, double distanceMeters, String distanceFormatted,
                         int transitMinutes, String transitMode, String navigationUrl) {
        this.sourceLocationId = sourceLocationId;
        this.sourceLocationName = sourceLocationName;
        this.sourceLocationType = sourceLocationType;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.quantityToPickup = quantityToPickup;
        this.stockAvailableAtLocation = stockAvailableAtLocation;
        this.distanceMeters = distanceMeters;
        this.distanceFormatted = distanceFormatted;
        this.transitMinutes = transitMinutes;
        this.transitMode = transitMode;
        this.navigationUrl = navigationUrl;
    }

    public UUID getSourceLocationId() { return sourceLocationId; }
    public void setSourceLocationId(UUID sourceLocationId) { this.sourceLocationId = sourceLocationId; }
    public String getSourceLocationName() { return sourceLocationName; }
    public void setSourceLocationName(String sourceLocationName) { this.sourceLocationName = sourceLocationName; }
    public String getSourceLocationType() { return sourceLocationType; }
    public void setSourceLocationType(String sourceLocationType) { this.sourceLocationType = sourceLocationType; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public int getQuantityToPickup() { return quantityToPickup; }
    public void setQuantityToPickup(int quantityToPickup) { this.quantityToPickup = quantityToPickup; }
    public int getStockAvailableAtLocation() { return stockAvailableAtLocation; }
    public void setStockAvailableAtLocation(int stockAvailableAtLocation) { this.stockAvailableAtLocation = stockAvailableAtLocation; }
    public double getDistanceMeters() { return distanceMeters; }
    public void setDistanceMeters(double distanceMeters) { this.distanceMeters = distanceMeters; }
    public String getDistanceFormatted() { return distanceFormatted; }
    public void setDistanceFormatted(String distanceFormatted) { this.distanceFormatted = distanceFormatted; }
    public int getTransitMinutes() { return transitMinutes; }
    public void setTransitMinutes(int transitMinutes) { this.transitMinutes = transitMinutes; }
    public String getTransitMode() { return transitMode; }
    public void setTransitMode(String transitMode) { this.transitMode = transitMode; }
    public String getNavigationUrl() { return navigationUrl; }
    public void setNavigationUrl(String navigationUrl) { this.navigationUrl = navigationUrl; }
}
