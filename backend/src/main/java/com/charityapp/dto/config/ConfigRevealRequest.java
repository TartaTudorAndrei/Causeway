package com.charityapp.dto.config;

public class ConfigRevealRequest {
    private String key;
    private String password;
    private String totpCode;

    public ConfigRevealRequest() {}

    public ConfigRevealRequest(String key, String password, String totpCode) {
        this.key = key;
        this.password = password;
        this.totpCode = totpCode;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getTotpCode() { return totpCode; }
    public void setTotpCode(String totpCode) { this.totpCode = totpCode; }
}
