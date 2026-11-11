package com.charityapp.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RequestAccessDTO {
    @NotBlank(message = "Numele este obligatoriu")
    @Size(min = 2, max = 100, message = "Numele trebuie sa contina intre 2 si 100 caractere")
    private String fullName;

    @NotBlank(message = "Emailul este obligatoriu")
    @Email(message = "Format email invalid")
    private String email;

    private String password;

    @NotBlank(message = "Numărul de telefon este obligatoriu")
    @Pattern(regexp = "^\\+?[0-9\\s\\-()]{7,20}$", message = "Format număr de telefon invalid")
    private String phone;
    private String orgType;
    private String orgDetails;
    private String justification;

    public RequestAccessDTO() {}

    public RequestAccessDTO(String fullName, String email, String password, String phone, String orgType, String orgDetails, String justification) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.orgType = orgType;
        this.orgDetails = orgDetails;
        this.justification = justification;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOrgType() { return orgType; }
    public void setOrgType(String orgType) { this.orgType = orgType; }

    public String getOrgDetails() { return orgDetails; }
    public void setOrgDetails(String orgDetails) { this.orgDetails = orgDetails; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }
}

