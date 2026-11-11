package com.charityapp.dto.auth;

import java.util.List;

public class TwoFactorStatusResponseDTO {
    private boolean enabled;
    private String method; // "NONE", "TOTP", "EMAIL", "BOTH"
    private List<String> availableMethods;

    public TwoFactorStatusResponseDTO() {}

    public TwoFactorStatusResponseDTO(boolean enabled, String method, List<String> availableMethods) {
        this.enabled = enabled;
        this.method = method;
        this.availableMethods = availableMethods;
    }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public List<String> getAvailableMethods() { return availableMethods; }
    public void setAvailableMethods(List<String> availableMethods) { this.availableMethods = availableMethods; }
}
