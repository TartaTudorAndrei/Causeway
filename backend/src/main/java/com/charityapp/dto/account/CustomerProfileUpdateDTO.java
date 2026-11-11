package com.charityapp.dto.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CustomerProfileUpdateDTO {

    @NotBlank(message = "Numele complet este obligatoriu.")
    @Size(min = 2, max = 100, message = "Numele trebuie să aibă între 2 și 100 de caractere.")
    private String fullName;

    private String phone;
    private String currentPassword;
    private String newPassword;

    public CustomerProfileUpdateDTO() {}

    public CustomerProfileUpdateDTO(String fullName, String phone) {
        this.fullName = fullName;
        this.phone = phone;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
