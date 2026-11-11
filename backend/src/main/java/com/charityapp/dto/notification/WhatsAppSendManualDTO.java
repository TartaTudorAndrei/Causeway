package com.charityapp.dto.notification;

public class WhatsAppSendManualDTO {
    private String targetAudience;
    private String targetValue;
    private String userId;
    private String phone;
    private String to;
    private String message;

    public WhatsAppSendManualDTO() {}

    public WhatsAppSendManualDTO(String targetAudience, String targetValue, String userId, String phone, String to, String message) {
        this.targetAudience = targetAudience;
        this.targetValue = targetValue;
        this.userId = userId;
        this.phone = phone;
        this.to = to;
        this.message = message;
    }

    public String getTargetAudience() {
        return targetAudience;
    }

    public void setTargetAudience(String targetAudience) {
        this.targetAudience = targetAudience;
    }

    public String getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(String targetValue) {
        this.targetValue = targetValue;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
