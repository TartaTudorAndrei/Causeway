package com.charityapp.dto.legal;

public class GoogleDocImportRequest {
    private String url;
    private String rawText;

    public GoogleDocImportRequest() {}

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getRawText() { return rawText; }
    public void setRawText(String rawText) { this.rawText = rawText; }
}
