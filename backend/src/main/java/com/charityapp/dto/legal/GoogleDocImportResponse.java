package com.charityapp.dto.legal;

import java.util.List;

public class GoogleDocImportResponse {
    private String title;
    private String content;
    private List<String> detectedFields;

    public GoogleDocImportResponse() {}

    public GoogleDocImportResponse(String title, String content, List<String> detectedFields) {
        this.title = title;
        this.content = content;
        this.detectedFields = detectedFields;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public List<String> getDetectedFields() { return detectedFields; }
    public void setDetectedFields(List<String> detectedFields) { this.detectedFields = detectedFields; }
}
