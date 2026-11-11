package com.charityapp.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class TwoFactorVerifyRequestDTO {
    @NotBlank(message = "Session token este obligatoriu.")
    private String sessionToken;

    @NotBlank(message = "Codul de verificare este obligatoriu.")
    private String code;

    private String method; // "TOTP" or "EMAIL"

    public TwoFactorVerifyRequestDTO() {}

    public TwoFactorVerifyRequestDTO(String sessionToken, String code, String method) {
        this.sessionToken = sessionToken;
        this.code = code;
        this.method = method;
    }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
}
