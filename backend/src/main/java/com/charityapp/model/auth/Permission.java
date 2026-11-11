package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class Permission {
    private UUID id;
    private String code;
    private String description;
    private String category;
    private LocalDateTime createdAt;

    public Permission() {}

    public Permission(String code, String description) {
        this(code, description, "GENERAL");
    }

    public Permission(String code, String description, String category) {
        this.code = code;
        this.description = description;
        this.category = category != null ? category : "GENERAL";
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
