package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class ApprovalRequest {
    private UUID id;
    private UUID requesterId;
    private String actionType;
    private String payload;
    private ApprovalStatus status;
    private String requiredPermission;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ApprovalRequest() {}

    public ApprovalRequest(UUID requesterId, String actionType, String payload, String requiredPermission) {
        this.requesterId = requesterId;
        this.actionType = actionType;
        this.payload = payload;
        this.status = ApprovalStatus.PENDING;
        this.requiredPermission = requiredPermission;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getRequesterId() { return requesterId; }
    public void setRequesterId(UUID requesterId) { this.requesterId = requesterId; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public ApprovalStatus getStatus() { return status; }
    public void setStatus(ApprovalStatus status) { this.status = status; }

    public String getRequiredPermission() { return requiredPermission; }
    public void setRequiredPermission(String requiredPermission) { this.requiredPermission = requiredPermission; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
