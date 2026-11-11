package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class EmailVerificationToken {
    private UUID id;
    private String tokenHash;
    private UUID adminUserId;
    private LocalDateTime expiryDate;
    private LocalDateTime createdAt;

    private UUID pendingShiftId;
    private UUID pendingRoleId;
    private UUID pendingStandId;

    public EmailVerificationToken() {}

    public EmailVerificationToken(String tokenHash, UUID adminUserId, LocalDateTime expiryDate) {
        this(tokenHash, adminUserId, expiryDate, null, null, null);
    }

    public EmailVerificationToken(String tokenHash, UUID adminUserId, LocalDateTime expiryDate,
                                  UUID pendingShiftId, UUID pendingRoleId, UUID pendingStandId) {
        this.tokenHash = tokenHash;
        this.adminUserId = adminUserId;
        this.expiryDate = expiryDate;
        this.createdAt = LocalDateTime.now();
        this.pendingShiftId = pendingShiftId;
        this.pendingRoleId = pendingRoleId;
        this.pendingStandId = pendingStandId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public UUID getAdminUserId() { return adminUserId; }
    public void setAdminUserId(UUID adminUserId) { this.adminUserId = adminUserId; }

    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public UUID getPendingShiftId() { return pendingShiftId; }
    public void setPendingShiftId(UUID pendingShiftId) { this.pendingShiftId = pendingShiftId; }

    public UUID getPendingRoleId() { return pendingRoleId; }
    public void setPendingRoleId(UUID pendingRoleId) { this.pendingRoleId = pendingRoleId; }

    public UUID getPendingStandId() { return pendingStandId; }
    public void setPendingStandId(UUID pendingStandId) { this.pendingStandId = pendingStandId; }
}
