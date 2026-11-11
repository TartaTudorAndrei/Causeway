package com.charityapp.model.hr;

import java.time.LocalDateTime;
import java.util.UUID;

public class HrMember {
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String department;
    private String role;
    private String onboardingStatus; // 'Pending', 'Onboarding', 'Active', 'Inactive'
    private String availability;
    private String notes;
    private UUID authUserId;
    private String authStatus;
    private String authRole;
    private String organizationType;
    private String organizationDetails;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public HrMember() {}

    public HrMember(UUID id, String fullName, String email, String phone, String department,
                    String role, String onboardingStatus, String availability, String notes) {
        this.id = id != null ? id : UUID.randomUUID();
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.department = department;
        this.role = role;
        this.onboardingStatus = onboardingStatus != null ? onboardingStatus : "Active";
        this.availability = availability;
        this.notes = notes;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getOnboardingStatus() { return onboardingStatus; }
    public void setOnboardingStatus(String onboardingStatus) { this.onboardingStatus = onboardingStatus; }

    public String getAvailability() { return availability; }
    public void setAvailability(String availability) { this.availability = availability; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public UUID getAuthUserId() { return authUserId; }
    public void setAuthUserId(UUID authUserId) { this.authUserId = authUserId; }

    public String getAuthStatus() { return authStatus; }
    public void setAuthStatus(String authStatus) { this.authStatus = authStatus; }

    public String getAuthRole() { return authRole; }
    public void setAuthRole(String authRole) { this.authRole = authRole; }

    public String getOrganizationType() { return organizationType; }
    public void setOrganizationType(String organizationType) { this.organizationType = organizationType; }

    public String getOrganizationDetails() { return organizationDetails; }
    public void setOrganizationDetails(String organizationDetails) { this.organizationDetails = organizationDetails; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
