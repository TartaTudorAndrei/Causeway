package com.charityapp.dto.sync;

public class DriveReceiptFileDto {
    private String id;
    private String name;
    private String mimeType;
    private String webViewLink;
    private String thumbnailLink;
    private Long size;
    private String modifiedTime;
    private boolean inReceiptsFolder;

    public DriveReceiptFileDto() {}

    public DriveReceiptFileDto(String id, String name, String mimeType, String webViewLink, String thumbnailLink, Long size, String modifiedTime, boolean inReceiptsFolder) {
        this.id = id;
        this.name = name;
        this.mimeType = mimeType;
        this.webViewLink = webViewLink;
        this.thumbnailLink = thumbnailLink;
        this.size = size;
        this.modifiedTime = modifiedTime;
        this.inReceiptsFolder = inReceiptsFolder;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public String getWebViewLink() { return webViewLink; }
    public void setWebViewLink(String webViewLink) { this.webViewLink = webViewLink; }

    public String getThumbnailLink() { return thumbnailLink; }
    public void setThumbnailLink(String thumbnailLink) { this.thumbnailLink = thumbnailLink; }

    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }

    public String getModifiedTime() { return modifiedTime; }
    public void setModifiedTime(String modifiedTime) { this.modifiedTime = modifiedTime; }

    public boolean isInReceiptsFolder() { return inReceiptsFolder; }
    public void setInReceiptsFolder(boolean inReceiptsFolder) { this.inReceiptsFolder = inReceiptsFolder; }
}
