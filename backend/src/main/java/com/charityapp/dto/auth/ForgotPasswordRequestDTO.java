package com.charityapp.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordRequestDTO {
    @NotBlank(message = "Adresa de email este obligatorie.")
    @Email(message = "Formatul adresei de email este invalid.")
    private String email;

    public ForgotPasswordRequestDTO() {}

    public ForgotPasswordRequestDTO(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
