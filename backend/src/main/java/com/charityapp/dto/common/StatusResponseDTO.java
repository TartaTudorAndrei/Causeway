package com.charityapp.dto.common;

public class StatusResponseDTO {
    private String status;

    public StatusResponseDTO() {}

    public StatusResponseDTO(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
