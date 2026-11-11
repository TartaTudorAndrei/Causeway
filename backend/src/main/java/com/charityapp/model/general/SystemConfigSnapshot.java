package com.charityapp.model.general;

import java.time.LocalDateTime;
import java.util.UUID;

public class SystemConfigSnapshot {
    private UUID id;
    private String snapshotLabel;
    private String configPayload;
    private LocalDateTime createdAt;
    private UUID createdBy;

    public SystemConfigSnapshot() {}

    public SystemConfigSnapshot(UUID id, String snapshotLabel, String configPayload, UUID createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.snapshotLabel = snapshotLabel;
        this.configPayload = configPayload;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSnapshotLabel() { return snapshotLabel; }
    public void setSnapshotLabel(String snapshotLabel) { this.snapshotLabel = snapshotLabel; }

    public String getConfigPayload() { return configPayload; }
    public void setConfigPayload(String configPayload) { this.configPayload = configPayload; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
}
