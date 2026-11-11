package com.charityapp.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class TwoFactorDisableRequestDTO {
    @NotBlank(message = "Parola este obligatorie.")
    private String password;

    private String code; // Optional confirmation code or TOTP/Email code

    public TwoFactorDisableRequestDTO() {}

    public TwoFactorDisableRequestDTO(String password, String code) {
        this.password = password;
        this.code = code;
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
