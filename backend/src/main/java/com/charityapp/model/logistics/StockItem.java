package com.charityapp.model.logistics;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "items", schema = "logistics")
public class StockItem {
    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String unit = "buc";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_sellable")
    private Boolean isSellable;

    @Column(name = "min_safety_stock")
    private Integer minSafetyStock = 30;

    @Column(name = "lead_time_days")
    private Integer leadTimeDays = 2;

    @Column(name = "target_stock")
    private Integer targetStock = 150;

    @Column(name = "daily_burn_rate")
    private Double dailyBurnRate;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public StockItem() {}

    public StockItem(UUID id, String name, String sku, String category, String unit, String notes) {
        this(id, name, sku, category, unit, notes, false);
    }

    public StockItem(UUID id, String name, String sku, String category, String unit, String notes, Boolean isSellable) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.sku = sku;
        this.category = category;
        this.unit = unit != null ? unit : "buc";
        this.notes = notes;
        this.isSellable = isSellable != null ? isSellable : false;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (isSellable == null) isSellable = false;
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    @com.fasterxml.jackson.annotation.JsonProperty("isSellable")
    public boolean getIsSellable() { return isSellable != null && isSellable; }

    @com.fasterxml.jackson.annotation.JsonProperty("isSellable")
    @com.fasterxml.jackson.annotation.JsonAlias({"isMug", "sellable", "mug"})
    public void setIsSellable(Boolean isSellable) { this.isSellable = isSellable; }

    public Boolean getRawIsSellable() { return isSellable; }
    public boolean isSellable() { return isSellable != null && isSellable; }
    public void setSellable(Boolean sellable) { this.isSellable = sellable; }

    // Compatibility aliases
    @com.fasterxml.jackson.annotation.JsonProperty("isMug")
    public boolean getIsMug() { return isSellable != null && isSellable; }
    public void setIsMug(Boolean isMug) { this.isSellable = isMug; }
    public Boolean getRawIsMug() { return isSellable; }
    public boolean isMug() { return isSellable != null && isSellable; }
    public void setMug(Boolean mug) { this.isSellable = mug; }
    public Integer getMinSafetyStock() { return minSafetyStock != null ? minSafetyStock : 30; }
    public void setMinSafetyStock(Integer minSafetyStock) { this.minSafetyStock = minSafetyStock; }

    public Integer getLeadTimeDays() { return leadTimeDays != null ? leadTimeDays : 2; }
    public void setLeadTimeDays(Integer leadTimeDays) { this.leadTimeDays = leadTimeDays; }

    public Integer getTargetStock() { return targetStock != null ? targetStock : 150; }
    public void setTargetStock(Integer targetStock) { this.targetStock = targetStock; }

    public Double getDailyBurnRate() { return dailyBurnRate; }
    public void setDailyBurnRate(Double dailyBurnRate) { this.dailyBurnRate = dailyBurnRate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
