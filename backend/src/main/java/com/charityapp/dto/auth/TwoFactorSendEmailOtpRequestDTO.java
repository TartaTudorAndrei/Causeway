package com.charityapp.dto.auth;

public class TwoFactorSendEmailOtpRequestDTO {
    private String sessionToken;

    public TwoFactorSendEmailOtpRequestDTO() {}

    public TwoFactorSendEmailOtpRequestDTO(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
}
