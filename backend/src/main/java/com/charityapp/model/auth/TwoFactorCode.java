package com.charityapp.model.auth;

import java.time.LocalDateTime;
import java.util.UUID;

public class TwoFactorCode {
    private UUID id;
    private UUID adminUserId;
    private String codeHash;
    private String codeType; // "LOGIN", "SETUP"
    private String sessionToken;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private boolean used;

    public TwoFactorCode() {}

    public TwoFactorCode(UUID adminUserId, String codeHash, String codeType, String sessionToken, LocalDateTime expiresAt) {
        this.id = UUID.randomUUID();
        this.adminUserId = adminUserId;
        this.codeHash = codeHash;
        this.codeType = codeType;
        this.sessionToken = sessionToken;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
        this.used = false;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAdminUserId() { return adminUserId; }
    public void setAdminUserId(UUID adminUserId) { this.adminUserId = adminUserId; }

    public String getCodeHash() { return codeHash; }
    public void setCodeHash(String codeHash) { this.codeHash = codeHash; }

    public String getCodeType() { return codeType; }
    public void setCodeType(String codeType) { this.codeType = codeType; }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
}
