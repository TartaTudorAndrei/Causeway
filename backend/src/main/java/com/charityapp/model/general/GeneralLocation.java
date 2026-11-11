package com.charityapp.model.general;

import java.time.LocalDateTime;
import java.util.UUID;

public class GeneralLocation {
    private UUID id;
    private String name;
    private String code;
    private String type; // STAND, DEPOSIT
    private String description;
    private Double latitude;
    private Double longitude;
    private String address;
    private boolean isSystem;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GeneralLocation() {}

    public GeneralLocation(UUID id, String name, String code, String type, String description,
                           Double latitude, Double longitude, String address, boolean isSystem) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.code = code;
        this.type = type != null ? type : "STAND";
        this.description = description;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.isSystem = isSystem;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public boolean isSystem() { return isSystem; }
    public void setSystem(boolean system) { isSystem = system; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
