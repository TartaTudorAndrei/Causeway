package com.charityapp.model.auth;

public enum AuthProvider {
    LOCAL,    // Email + password only
    GOOGLE,  // Google OAuth only
    HYBRID;  // Both methods available

    public static AuthProvider fromString(String value) {
        if (value == null || value.isBlank()) return LOCAL;
        try {
            return AuthProvider.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return LOCAL;
        }
    }
}
