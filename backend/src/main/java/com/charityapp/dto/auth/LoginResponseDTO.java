package com.charityapp.dto.auth;

public class LoginResponseDTO {
    private String token;
    private String expiresAt;
    private UserDetailsDTO user;

    // 2FA Fields
    private boolean twoFactorRequired = false;
    private String twoFactorSessionToken;
    private java.util.List<String> twoFactorMethods;
    private String maskedEmail;

    public LoginResponseDTO() {}

    public LoginResponseDTO(String token, String expiresAt, UserDetailsDTO user) {
        this.token = token;
        this.expiresAt = expiresAt;
        this.user = user;
        this.twoFactorRequired = false;
    }

    public static LoginResponseDTO twoFactorRequired(String sessionToken, java.util.List<String> methods, String maskedEmail) {
        LoginResponseDTO res = new LoginResponseDTO();
        res.setTwoFactorRequired(true);
        res.setTwoFactorSessionToken(sessionToken);
        res.setTwoFactorMethods(methods);
        res.setMaskedEmail(maskedEmail);
        return res;
    }

    public boolean isTwoFactorRequired() { return twoFactorRequired; }
    public void setTwoFactorRequired(boolean twoFactorRequired) { this.twoFactorRequired = twoFactorRequired; }

    public String getTwoFactorSessionToken() { return twoFactorSessionToken; }
    public void setTwoFactorSessionToken(String twoFactorSessionToken) { this.twoFactorSessionToken = twoFactorSessionToken; }

    public java.util.List<String> getTwoFactorMethods() { return twoFactorMethods; }
    public void setTwoFactorMethods(java.util.List<String> twoFactorMethods) { this.twoFactorMethods = twoFactorMethods; }

    public String getMaskedEmail() { return maskedEmail; }
    public void setMaskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }

    public UserDetailsDTO getUser() { return user; }
    public void setUser(UserDetailsDTO user) { this.user = user; }

    public static class UserDetailsDTO {
        private String name;
        private String email;
        private String role;
        private java.util.List<String> roles;
        private String phone;
        private String organizationType;
        private String organizationDetails;
        private Boolean whatsappNotificationsEnabled = true;

        private java.util.List<String> permissions;

        public UserDetailsDTO() {}

        public UserDetailsDTO(String name, String email, String role) {
            this.name = name;
            this.email = email;
            this.role = role;
            this.roles = role != null ? java.util.List.of(role) : java.util.List.of("VOLUNTEER");
        }

        public UserDetailsDTO(String name, String email, String role, java.util.List<String> roles, String phone, String organizationType, String organizationDetails) {
            this.name = name;
            this.email = email;
            this.role = role;
            this.roles = roles != null && !roles.isEmpty() ? roles : (role != null ? java.util.List.of(role) : java.util.List.of("VOLUNTEER"));
            this.phone = phone;
            this.organizationType = organizationType;
            this.organizationDetails = organizationDetails;
        }

        public UserDetailsDTO(String name, String email, String role, java.util.List<String> roles, String phone, String organizationType, String organizationDetails, java.util.List<String> permissions) {
            this(name, email, role, roles, phone, organizationType, organizationDetails);
            this.permissions = permissions;
        }

        public UserDetailsDTO(String name, String email, String role, java.util.List<String> roles, String phone, String organizationType, String organizationDetails, java.util.List<String> permissions, Boolean whatsappNotificationsEnabled) {
            this(name, email, role, roles, phone, organizationType, organizationDetails, permissions);
            this.whatsappNotificationsEnabled = whatsappNotificationsEnabled != null ? whatsappNotificationsEnabled : true;
        }

        public UserDetailsDTO(String name, String email, String role, String phone, String organizationType, String organizationDetails) {
            this(name, email, role, role != null ? java.util.List.of(role) : java.util.List.of("VOLUNTEER"), phone, organizationType, organizationDetails);
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public java.util.List<String> getRoles() {
            if (roles != null && !roles.isEmpty()) return roles;
            return role != null ? java.util.List.of(role) : java.util.List.of("VOLUNTEER");
        }
        public void setRoles(java.util.List<String> roles) { this.roles = roles; }

        public java.util.List<String> getPermissions() { return permissions; }
        public void setPermissions(java.util.List<String> permissions) { this.permissions = permissions; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getOrganizationType() { return organizationType; }
        public void setOrganizationType(String organizationType) { this.organizationType = organizationType; }

        public String getOrganizationDetails() { return organizationDetails; }
        public void setOrganizationDetails(String organizationDetails) { this.organizationDetails = organizationDetails; }

        public Boolean getWhatsappNotificationsEnabled() { return whatsappNotificationsEnabled != null ? whatsappNotificationsEnabled : true; }
        public void setWhatsappNotificationsEnabled(Boolean whatsappNotificationsEnabled) { this.whatsappNotificationsEnabled = whatsappNotificationsEnabled; }
    }
}
