package com.charityapp.dto.logistics;

import java.util.List;
import java.util.UUID;

public class RefillOptimizerResponse {
    private UUID destinationLocationId;
    private String destinationLocationName;
    private UUID itemId;
    private String itemName;
    private String unit;
    private int requestedQuantity;
    private int currentDestinationStock;
    private RefillOptionDTO option1Express;
    private RefillOptionDTO option2WalkingEmergency;
    private RefillOptionDTO option3MultiStop;

    public RefillOptimizerResponse() {}

    public RefillOptimizerResponse(UUID destinationLocationId, String destinationLocationName,
                                   UUID itemId, String itemName, String unit, int requestedQuantity,
                                   int currentDestinationStock, RefillOptionDTO option1Express,
                                   RefillOptionDTO option2WalkingEmergency, RefillOptionDTO option3MultiStop) {
        this.destinationLocationId = destinationLocationId;
        this.destinationLocationName = destinationLocationName;
        this.itemId = itemId;
        this.itemName = itemName;
        this.unit = unit;
        this.requestedQuantity = requestedQuantity;
        this.currentDestinationStock = currentDestinationStock;
        this.option1Express = option1Express;
        this.option2WalkingEmergency = option2WalkingEmergency;
        this.option3MultiStop = option3MultiStop;
    }

    public UUID getDestinationLocationId() { return destinationLocationId; }
    public void setDestinationLocationId(UUID destinationLocationId) { this.destinationLocationId = destinationLocationId; }
    public String getDestinationLocationName() { return destinationLocationName; }
    public void setDestinationLocationName(String destinationLocationName) { this.destinationLocationName = destinationLocationName; }
    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public int getRequestedQuantity() { return requestedQuantity; }
    public void setRequestedQuantity(int requestedQuantity) { this.requestedQuantity = requestedQuantity; }
    public int getCurrentDestinationStock() { return currentDestinationStock; }
    public void setCurrentDestinationStock(int currentDestinationStock) { this.currentDestinationStock = currentDestinationStock; }
    public RefillOptionDTO getOption1Express() { return option1Express; }
    public void setOption1Express(RefillOptionDTO option1Express) { this.option1Express = option1Express; }
    public RefillOptionDTO getOption2WalkingEmergency() { return option2WalkingEmergency; }
    public void setOption2WalkingEmergency(RefillOptionDTO option2WalkingEmergency) { this.option2WalkingEmergency = option2WalkingEmergency; }
    public RefillOptionDTO getOption3MultiStop() { return option3MultiStop; }
    public void setOption3MultiStop(RefillOptionDTO option3MultiStop) { this.option3MultiStop = option3MultiStop; }
}
