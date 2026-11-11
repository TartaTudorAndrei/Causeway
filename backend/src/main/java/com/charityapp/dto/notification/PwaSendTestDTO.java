package com.charityapp.dto.notification;

public class PwaSendTestDTO {
    private String targetAudience;
    private String userId;
    private String userEmail;
    private String targetValue;
    private String title;
    private String body;
    private String actionUrl;

    public PwaSendTestDTO() {}

    public PwaSendTestDTO(String targetAudience, String userId, String userEmail, String targetValue, String title, String body, String actionUrl) {
        this.targetAudience = targetAudience;
        this.userId = userId;
        this.userEmail = userEmail;
        this.targetValue = targetValue;
        this.title = title;
        this.body = body;
        this.actionUrl = actionUrl;
    }

    public String getTargetAudience() { return targetAudience; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getTargetValue() { return targetValue; }
    public void setTargetValue(String targetValue) { this.targetValue = targetValue; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }
}

