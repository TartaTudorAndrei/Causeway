package com.charityapp.dto.auth;

import java.util.List;

public class TwoFactorSetupInitiateResponseDTO {
    private String secret;
    private String otpAuthUrl;
    private String email;
    private List<String> availableMethods;

    public TwoFactorSetupInitiateResponseDTO() {}

    public TwoFactorSetupInitiateResponseDTO(String secret, String otpAuthUrl, String email, List<String> availableMethods) {
        this.secret = secret;
        this.otpAuthUrl = otpAuthUrl;
        this.email = email;
        this.availableMethods = availableMethods;
    }

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }

    public String getOtpAuthUrl() { return otpAuthUrl; }
    public void setOtpAuthUrl(String otpAuthUrl) { this.otpAuthUrl = otpAuthUrl; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public List<String> getAvailableMethods() { return availableMethods; }
    public void setAvailableMethods(List<String> availableMethods) { this.availableMethods = availableMethods; }
}
