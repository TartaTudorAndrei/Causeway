package com.charityapp.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class GoogleRegisterRequestDTO {

    @NotBlank(message = "ID Token-ul Google este obligatoriu.")
    private String credential;

    @NotBlank(message = "Numele este obligatoriu")
    @Size(min = 2, max = 100, message = "Numele trebuie sa contina intre 2 si 100 caractere")
    private String fullName;

    @NotBlank(message = "Numărul de telefon este obligatoriu")
    @Pattern(regexp = "^\\+?[0-9\\s\\-()]{7,20}$", message = "Format număr de telefon invalid")
    private String phone;

    private String orgType;
    private String orgDetails;
    private String justification;

    public GoogleRegisterRequestDTO() {}

    public GoogleRegisterRequestDTO(String credential, String fullName, String phone, String orgType, String orgDetails, String justification) {
        this.credential = credential;
        this.fullName = fullName;
        this.phone = phone;
        this.orgType = orgType;
        this.orgDetails = orgDetails;
        this.justification = justification;
    }

    public String getCredential() { return credential; }
    public void setCredential(String credential) { this.credential = credential; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOrgType() { return orgType; }
    public void setOrgType(String orgType) { this.orgType = orgType; }

    public String getOrgDetails() { return orgDetails; }
    public void setOrgDetails(String orgDetails) { this.orgDetails = orgDetails; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }
}
