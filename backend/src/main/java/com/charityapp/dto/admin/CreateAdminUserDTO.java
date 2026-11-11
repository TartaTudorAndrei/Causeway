package com.charityapp.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateAdminUserDTO {
    @NotBlank(message = "Numele este obligatoriu")
    @Size(min = 2, max = 100, message = "Numele trebuie să conțină între 2 și 100 caractere")
    private String fullName;

    @NotBlank(message = "Emailul este obligatoriu")
    @Email(message = "Format email invalid")
    private String email;

    private String password;
    private String phone;
    private String organizationType;
    private String organizationDetails;
    private String role;
    private java.util.List<String> roles;
    private String status;
    private String notes;

    public CreateAdminUserDTO() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOrganizationType() { return organizationType; }
    public void setOrganizationType(String organizationType) { this.organizationType = organizationType; }

    public String getOrganizationDetails() { return organizationDetails; }
    public void setOrganizationDetails(String organizationDetails) { this.organizationDetails = organizationDetails; }

    public String getRole() { 
        if (role != null) return role;
        if (roles != null && !roles.isEmpty()) return roles.get(0);
        return "VOLUNTEER";
    }
    public void setRole(String role) { this.role = role; }

    public java.util.List<String> getRoles() {
        if (roles != null && !roles.isEmpty()) return roles;
        String r = getRole();
        return java.util.List.of(r != null ? r : "VOLUNTEER");
    }
    public void setRoles(java.util.List<String> roles) { this.roles = roles; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
