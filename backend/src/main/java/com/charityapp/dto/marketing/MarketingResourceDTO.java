package com.charityapp.dto.marketing;

public class MarketingResourceDTO {
    private String id;
    private String name;
    private String mimeType;
    private Long size;
    private String webViewLink;
    private String webContentLink;
    private String thumbnailLink;
    private String modifiedTime;
    private boolean isFolder;

    public MarketingResourceDTO() {}

    public MarketingResourceDTO(String id, String name, String mimeType, Long size, String webViewLink, String webContentLink, String thumbnailLink, String modifiedTime, boolean isFolder) {
        this.id = id;
        this.name = name;
        this.mimeType = mimeType;
        this.size = size;
        this.webViewLink = webViewLink;
        this.webContentLink = webContentLink;
        this.thumbnailLink = thumbnailLink;
        this.modifiedTime = modifiedTime;
        this.isFolder = isFolder;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public String getWebViewLink() { return webViewLink; }
    public void setWebViewLink(String webViewLink) { this.webViewLink = webViewLink; }
    public String getWebContentLink() { return webContentLink; }
    public void setWebContentLink(String webContentLink) { this.webContentLink = webContentLink; }
    public String getThumbnailLink() { return thumbnailLink; }
    public void setThumbnailLink(String thumbnailLink) { this.thumbnailLink = thumbnailLink; }
    public String getModifiedTime() { return modifiedTime; }
    public void setModifiedTime(String modifiedTime) { this.modifiedTime = modifiedTime; }
    public boolean isFolder() { return isFolder; }
    public boolean getFolder() { return isFolder; }
    public void setFolder(boolean folder) { isFolder = folder; }
    public void setIsFolder(boolean folder) { isFolder = folder; }
}
