package com.charityapp.model.general;

import java.time.LocalDateTime;
import java.util.UUID;

public class GeneralEvent {
    private UUID id;
    private String title;
    private String description;
    private String date; // YYYY-MM-DD (start date)
    private String endDate; // YYYY-MM-DD (end date / interval)
    private String time; // HH:mm
    private String department;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean isSpecialDemand = false;
    private double demandMultiplier = 1.0;
    private String demandTag; // e.g. CONCERT, HOLIDAY, SPECIAL_EVENT, SURGE

    public GeneralEvent() {
        this.id = UUID.randomUUID();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public GeneralEvent(UUID id, String title, String description, String date, String time,
                        String department, String createdBy) {
        this(id, title, description, date, null, time, department, createdBy);
    }

    public GeneralEvent(UUID id, String title, String description, String date, String endDate, String time,
                        String department, String createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.title = title;
        this.description = description;
        this.date = date;
        this.endDate = endDate;
        this.time = time;
        this.department = department;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public boolean isSpecialDemand() { return isSpecialDemand; }
    public void setSpecialDemand(boolean specialDemand) { isSpecialDemand = specialDemand; }

    public double getDemandMultiplier() { return demandMultiplier; }
    public void setDemandMultiplier(double demandMultiplier) { this.demandMultiplier = demandMultiplier; }

    public String getDemandTag() { return demandTag; }
    public void setDemandTag(String demandTag) { this.demandTag = demandTag; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
