package com.charityapp.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class GoogleLoginRequestDTO {
    @NotBlank(message = "ID Token-ul Google este obligatoriu.")
    private String credential;

    public GoogleLoginRequestDTO() {
    }

    public GoogleLoginRequestDTO(String credential) {
        this.credential = credential;
    }

    public String getCredential() {
        return credential;
    }

    public void setCredential(String credential) {
        this.credential = credential;
    }
}
