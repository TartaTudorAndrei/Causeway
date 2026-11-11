package com.charityapp.model.hr;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class HrStand {
    private UUID id;
    private String locationName;
    private String eventName;
    private LocalDate eventDate;
    private String status; // 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
    private String notes;
    private String qrCodeToken;
    private List<HrShift> shifts = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public HrStand() {}

    public HrStand(UUID id, String locationName, String eventName, LocalDate eventDate, String status, String notes) {
        this.id = id != null ? id : UUID.randomUUID();
        this.locationName = locationName;
        this.eventName = eventName;
        this.eventDate = eventDate;
        this.status = status != null ? status : "PLANNED";
        this.notes = notes;
        this.qrCodeToken = UUID.randomUUID().toString().replace("-", "");
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getQrCodeToken() { return qrCodeToken; }
    public void setQrCodeToken(String qrCodeToken) { this.qrCodeToken = qrCodeToken; }

    public List<HrShift> getShifts() { return shifts; }
    public void setShifts(List<HrShift> shifts) { this.shifts = shifts; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
