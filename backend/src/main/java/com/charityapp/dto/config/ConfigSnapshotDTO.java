package com.charityapp.dto.config;

import java.time.LocalDateTime;
import java.util.UUID;

public class ConfigSnapshotDTO {
    private UUID id;
    private String snapshotLabel;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private int keysCount;

    public ConfigSnapshotDTO() {}

    public ConfigSnapshotDTO(UUID id, String snapshotLabel, LocalDateTime createdAt, UUID createdBy, int keysCount) {
        this.id = id;
        this.snapshotLabel = snapshotLabel;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.keysCount = keysCount;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSnapshotLabel() { return snapshotLabel; }
    public void setSnapshotLabel(String snapshotLabel) { this.snapshotLabel = snapshotLabel; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public int getKeysCount() { return keysCount; }
    public void setKeysCount(int keysCount) { this.keysCount = keysCount; }
}
