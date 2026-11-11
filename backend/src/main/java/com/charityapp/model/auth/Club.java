package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class Club {
    private UUID id;
    private String name;
    private String organizationType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Club() {}

    public Club(UUID id, String name, String organizationType) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.organizationType = organizationType;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOrganizationType() { return organizationType; }
    public void setOrganizationType(String organizationType) { this.organizationType = organizationType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
