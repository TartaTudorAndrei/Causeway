package com.charityapp.dto.sync;

public class GoogleDriveSubfolderDTO {
    private String name;
    private String folderId;
    private String folderUrl;

    public GoogleDriveSubfolderDTO() {}

    public GoogleDriveSubfolderDTO(String name, String folderId, String folderUrl) {
        this.name = name;
        this.folderId = folderId;
        this.folderUrl = folderUrl;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFolderId() { return folderId; }
    public void setFolderId(String folderId) { this.folderId = folderId; }

    public String getFolderUrl() { return folderUrl; }
    public void setFolderUrl(String folderUrl) { this.folderUrl = folderUrl; }
}
