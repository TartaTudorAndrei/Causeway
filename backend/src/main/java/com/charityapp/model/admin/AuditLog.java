package com.charityapp.model.admin;
import com.charityapp.model.auth.*;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuditLog {
    private UUID id;
    private UUID actorId;
    private String actorEmail;
    private String actorName;
    private String department;
    private String action;
    private String resourceType;
    private UUID resourceId;
    private String resourceName;
    private String summary;
    private ScopeType scopeType;
    private UUID scopeId;
    private String stateChanges;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;

    public AuditLog() {}

    public AuditLog(UUID actorId, String actorEmail, String actorName, String department,
                    String action, String resourceType, UUID resourceId, String resourceName,
                    String summary, ScopeType scopeType, UUID scopeId, String stateChanges,
                    String ipAddress, String userAgent) {
        this.actorId = actorId;
        this.actorEmail = actorEmail;
        this.actorName = actorName;
        this.department = department != null ? department : "GENERAL";
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.resourceName = resourceName;
        this.summary = summary;
        this.scopeType = scopeType != null ? scopeType : ScopeType.GLOBAL;
        this.scopeId = scopeId;
        this.stateChanges = stateChanges;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.createdAt = LocalDateTime.now();
    }

    public AuditLog(UUID actorId, String actorEmail, String action, String resourceType, UUID resourceId,
                    String summary, String ipAddress, String userAgent) {
        this.actorId = actorId;
        this.actorEmail = actorEmail != null ? actorEmail : "system@example.org";
        this.actorName = actorEmail != null ? actorEmail.split("@")[0] : "System";
        this.department = "AUTH";
        this.action = action;
        this.resourceType = resourceType != null ? resourceType : "ADMIN_USER";
        this.resourceId = resourceId;
        this.summary = summary;
        this.scopeType = ScopeType.GLOBAL;
        this.stateChanges = "{}";
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getActorId() { return actorId; }
    public void setActorId(UUID actorId) { this.actorId = actorId; }

    public String getActorEmail() { return actorEmail; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }

    public UUID getResourceId() { return resourceId; }
    public void setResourceId(UUID resourceId) { this.resourceId = resourceId; }

    public String getResourceName() { return resourceName; }
    public void setResourceName(String resourceName) { this.resourceName = resourceName; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public ScopeType getScopeType() { return scopeType; }
    public void setScopeType(ScopeType scopeType) { this.scopeType = scopeType; }

    public UUID getScopeId() { return scopeId; }
    public void setScopeId(UUID scopeId) { this.scopeId = scopeId; }

    public String getStateChanges() { return stateChanges; }
    public void setStateChanges(String stateChanges) { this.stateChanges = stateChanges; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
