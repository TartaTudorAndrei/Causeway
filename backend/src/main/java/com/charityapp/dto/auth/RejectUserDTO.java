package com.charityapp.dto.auth;

public class RejectUserDTO {
    private String reason;

    public RejectUserDTO() {}

    public RejectUserDTO(String reason) {
        this.reason = reason;
    }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
