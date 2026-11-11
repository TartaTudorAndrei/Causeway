package com.charityapp.dto.account;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CustomerRegisterRequestDTO {

    @NotBlank(message = "Numele complet este obligatoriu.")
    @Size(min = 2, max = 100, message = "Numele trebuie să aibă între 2 și 100 de caractere.")
    private String fullName;

    @NotBlank(message = "Adresa de email este obligatorie.")
    @Email(message = "Formatul adresei de email este invalid.")
    private String email;

    @NotBlank(message = "Parola este obligatorie.")
    @Size(min = 8, max = 100, message = "Parola trebuie să aibă cel puțin 8 caractere.")
    private String password;

    private String phone;

    public CustomerRegisterRequestDTO() {}

    public CustomerRegisterRequestDTO(String fullName, String email, String password, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.phone = phone;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
