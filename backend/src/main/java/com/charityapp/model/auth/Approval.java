package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class Approval {
    private UUID id;
    private UUID requestId;
    private UUID approverId;
    private ApprovalStatus decision;
    private String comments;
    private LocalDateTime createdAt;

    public Approval() {}

    public Approval(UUID requestId, UUID approverId, ApprovalStatus decision, String comments) {
        this.requestId = requestId;
        this.approverId = approverId;
        this.decision = decision;
        this.comments = comments;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getRequestId() { return requestId; }
    public void setRequestId(UUID requestId) { this.requestId = requestId; }

    public UUID getApproverId() { return approverId; }
    public void setApproverId(UUID approverId) { this.approverId = approverId; }

    public ApprovalStatus getDecision() { return decision; }
    public void setDecision(ApprovalStatus decision) { this.decision = decision; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
