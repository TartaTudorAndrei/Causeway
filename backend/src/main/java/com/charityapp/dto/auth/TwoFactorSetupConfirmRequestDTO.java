package com.charityapp.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class TwoFactorSetupConfirmRequestDTO {
    @NotBlank(message = "Metoda 2FA este obligatorie.")
    private String method; // "TOTP", "EMAIL", "BOTH"

    @NotBlank(message = "Codul de verificare este obligatoriu.")
    private String code;

    private String secret; // Base32 secret if TOTP/BOTH

    public TwoFactorSetupConfirmRequestDTO() {}

    public TwoFactorSetupConfirmRequestDTO(String method, String code, String secret) {
        this.method = method;
        this.code = code;
        this.secret = secret;
    }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}
