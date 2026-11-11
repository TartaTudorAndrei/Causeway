package com.charityapp.dto.marketing;

import java.util.List;

public class MarketingResourcesResponseDTO {
    private String folderId;
    private String folderUrl;
    private List<MarketingResourceDTO> resources;

    public MarketingResourcesResponseDTO() {}

    public MarketingResourcesResponseDTO(String folderId, String folderUrl, List<MarketingResourceDTO> resources) {
        this.folderId = folderId;
        this.folderUrl = folderUrl;
        this.resources = resources;
    }

    public String getFolderId() { return folderId; }
    public void setFolderId(String folderId) { this.folderId = folderId; }
    public String getFolderUrl() { return folderUrl; }
    public void setFolderUrl(String folderUrl) { this.folderUrl = folderUrl; }
    public List<MarketingResourceDTO> getResources() { return resources; }
    public void setResources(List<MarketingResourceDTO> resources) { this.resources = resources; }
}
