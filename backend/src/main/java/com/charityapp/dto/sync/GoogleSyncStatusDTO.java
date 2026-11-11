package com.charityapp.dto.sync;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class GoogleSyncStatusDTO {
    private boolean connected;
    private String mode; // "SERVICE_ACCOUNT" or "NOT_CONFIGURED"
    private String serviceAccountEmail;
    private String spreadsheetId;
    private String spreadsheetUrl;
    private String folderId;
    private String folderUrl;
    private LocalDateTime lastSyncTimestamp;
    private String lastSyncStatus; // "SUCCESS", "FAILED", "PENDING", "IDLE"
    private String message;
    private int syncedTabsCount;
    private List<String> syncedTabNames;
    private int totalRowsSynced;
    private List<GoogleDriveFolderDTO> folders = new ArrayList<>();

    public GoogleSyncStatusDTO() {}

    public boolean isConnected() { return connected; }
    public void setConnected(boolean connected) { this.connected = connected; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getServiceAccountEmail() { return serviceAccountEmail; }
    public void setServiceAccountEmail(String serviceAccountEmail) { this.serviceAccountEmail = serviceAccountEmail; }

    public String getSpreadsheetId() { return spreadsheetId; }
    public void setSpreadsheetId(String spreadsheetId) { this.spreadsheetId = spreadsheetId; }

    public String getSpreadsheetUrl() { return spreadsheetUrl; }
    public void setSpreadsheetUrl(String spreadsheetUrl) { this.spreadsheetUrl = spreadsheetUrl; }

    public String getFolderId() { return folderId; }
    public void setFolderId(String folderId) { this.folderId = folderId; }

    public String getFolderUrl() { return folderUrl; }
    public void setFolderUrl(String folderUrl) { this.folderUrl = folderUrl; }

    public LocalDateTime getLastSyncTimestamp() { return lastSyncTimestamp; }
    public void setLastSyncTimestamp(LocalDateTime lastSyncTimestamp) { this.lastSyncTimestamp = lastSyncTimestamp; }

    public String getLastSyncStatus() { return lastSyncStatus; }
    public void setLastSyncStatus(String lastSyncStatus) { this.lastSyncStatus = lastSyncStatus; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public int getSyncedTabsCount() { return syncedTabsCount; }
    public void setSyncedTabsCount(int syncedTabsCount) { this.syncedTabsCount = syncedTabsCount; }

    public List<String> getSyncedTabNames() { return syncedTabNames; }
    public void setSyncedTabNames(List<String> syncedTabNames) { this.syncedTabNames = syncedTabNames; }

    public int getTotalRowsSynced() { return totalRowsSynced; }
    public void setTotalRowsSynced(int totalRowsSynced) { this.totalRowsSynced = totalRowsSynced; }

    public List<GoogleDriveFolderDTO> getFolders() { return folders; }
    public void setFolders(List<GoogleDriveFolderDTO> folders) { this.folders = folders; }
}
