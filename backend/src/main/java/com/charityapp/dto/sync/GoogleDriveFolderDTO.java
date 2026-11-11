package com.charityapp.dto.sync;

import java.util.ArrayList;
import java.util.List;

public class GoogleDriveFolderDTO {
    private String domain;
    private String name;
    private String folderId;
    private String folderUrl;
    private String spreadsheetId;
    private String spreadsheetUrl;
    private String spreadsheetName;
    private List<GoogleDriveSubfolderDTO> subfolders = new ArrayList<>();

    public GoogleDriveFolderDTO() {}

    public GoogleDriveFolderDTO(String domain, String name, String folderId, String folderUrl) {
        this.domain = domain;
        this.name = name;
        this.folderId = folderId;
        this.folderUrl = folderUrl;
    }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFolderId() { return folderId; }
    public void setFolderId(String folderId) { this.folderId = folderId; }

    public String getFolderUrl() { return folderUrl; }
    public void setFolderUrl(String folderUrl) { this.folderUrl = folderUrl; }

    public String getSpreadsheetId() { return spreadsheetId; }
    public void setSpreadsheetId(String spreadsheetId) { this.spreadsheetId = spreadsheetId; }

    public String getSpreadsheetUrl() { return spreadsheetUrl; }
    public void setSpreadsheetUrl(String spreadsheetUrl) { this.spreadsheetUrl = spreadsheetUrl; }

    public String getSpreadsheetName() { return spreadsheetName; }
    public void setSpreadsheetName(String spreadsheetName) { this.spreadsheetName = spreadsheetName; }

    public List<GoogleDriveSubfolderDTO> getSubfolders() { return subfolders; }
    public void setSubfolders(List<GoogleDriveSubfolderDTO> subfolders) { this.subfolders = subfolders; }

    public void addSubfolder(GoogleDriveSubfolderDTO subfolder) {
        if (this.subfolders == null) {
            this.subfolders = new ArrayList<>();
        }
        this.subfolders.add(subfolder);
    }
}
