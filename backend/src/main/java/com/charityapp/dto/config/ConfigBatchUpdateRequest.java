package com.charityapp.dto.config;

import java.util.Map;

public class ConfigBatchUpdateRequest {
    private Map<String, String> values;
    private String password;
    private String totpCode;

    public ConfigBatchUpdateRequest() {}

    public ConfigBatchUpdateRequest(Map<String, String> values, String password, String totpCode) {
        this.values = values;
        this.password = password;
        this.totpCode = totpCode;
    }

    public Map<String, String> getValues() { return values; }
    public void setValues(Map<String, String> values) { this.values = values; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getTotpCode() { return totpCode; }
    public void setTotpCode(String totpCode) { this.totpCode = totpCode; }
}
