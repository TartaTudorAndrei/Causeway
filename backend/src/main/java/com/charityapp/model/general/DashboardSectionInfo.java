package com.charityapp.model.general;

import java.sql.Timestamp;

public class DashboardSectionInfo {
    private String sectionKey;
    private String title;
    private String contentMarkdown;
    private String googleDocUrl;
    private String updatedBy;
    private Timestamp updatedAt;

    public DashboardSectionInfo() {}

    public DashboardSectionInfo(String sectionKey, String title, String contentMarkdown, String googleDocUrl, String updatedBy, Timestamp updatedAt) {
        this.sectionKey = sectionKey;
        this.title = title;
        this.contentMarkdown = contentMarkdown;
        this.googleDocUrl = googleDocUrl;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    public String getSectionKey() {
        return sectionKey;
    }

    public void setSectionKey(String sectionKey) {
        this.sectionKey = sectionKey;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }

    public String getGoogleDocUrl() {
        return googleDocUrl;
    }

    public void setGoogleDocUrl(String googleDocUrl) {
        this.googleDocUrl = googleDocUrl;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }
}
