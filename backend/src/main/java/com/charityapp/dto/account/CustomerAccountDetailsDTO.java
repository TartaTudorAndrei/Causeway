package com.charityapp.dto.account;

import java.util.List;
import java.util.UUID;

public class CustomerAccountDetailsDTO {
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private List<String> roles;
    private boolean isVolunteerOrStaff;

    public CustomerAccountDetailsDTO() {}

    public CustomerAccountDetailsDTO(UUID id, String fullName, String email, String phone, String role, List<String> roles, boolean isVolunteerOrStaff) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.roles = roles;
        this.isVolunteerOrStaff = isVolunteerOrStaff;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public boolean isVolunteerOrStaff() { return isVolunteerOrStaff; }
    public void setVolunteerOrStaff(boolean volunteerOrStaff) { isVolunteerOrStaff = volunteerOrStaff; }
}
