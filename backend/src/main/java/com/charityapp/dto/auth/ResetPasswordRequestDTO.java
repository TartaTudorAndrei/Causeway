package com.charityapp.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequestDTO {
    @NotBlank(message = "Token-ul de resetare este obligatoriu.")
    private String token;

    @NotBlank(message = "Parola nouă este obligatorie.")
    @Size(min = 8, message = "Parola trebuie să aibă cel puțin 8 caractere.")
    private String newPassword;

    public ResetPasswordRequestDTO() {}

    public ResetPasswordRequestDTO(String token, String newPassword) {
        this.token = token;
        this.newPassword = newPassword;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
