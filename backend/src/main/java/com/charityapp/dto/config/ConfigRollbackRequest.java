package com.charityapp.dto.config;

public class ConfigRollbackRequest {
    private String password;
    private String totpCode;

    public ConfigRollbackRequest() {}

    public ConfigRollbackRequest(String password, String totpCode) {
        this.password = password;
        this.totpCode = totpCode;
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getTotpCode() { return totpCode; }
    public void setTotpCode(String totpCode) { this.totpCode = totpCode; }
}
