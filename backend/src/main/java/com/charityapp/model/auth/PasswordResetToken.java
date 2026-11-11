package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class PasswordResetToken {
    private UUID id;
    private String tokenHash;
    private UUID adminUserId;
    private LocalDateTime expiryDate;
    private LocalDateTime createdAt;

    public PasswordResetToken() {}

    public PasswordResetToken(String tokenHash, UUID adminUserId, LocalDateTime expiryDate) {
        this.tokenHash = tokenHash;
        this.adminUserId = adminUserId;
        this.expiryDate = expiryDate;
        this.createdAt = LocalDateTime.now();
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
}
