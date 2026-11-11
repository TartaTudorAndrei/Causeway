package com.charityapp.model.auth;

public enum AdminStatus {
    PENDING_EMAIL_VERIFICATION,
    PENDING_APPROVAL,
    APPROVED,
    REJECTED,
    SUSPENDED;

    public static AdminStatus fromString(String val) {
        if (val == null || val.isBlank()) {
            return APPROVED;
        }
        String clean = val.trim().toUpperCase();
        if ("PENDING".equals(clean) || "PENDING_APPROVAL".equals(clean)) {
            return PENDING_APPROVAL;
        }
        if ("PENDING_EMAIL".equals(clean) || "PENDING_EMAIL_VERIFICATION".equals(clean)) {
            return PENDING_EMAIL_VERIFICATION;
        }
        try {
            return AdminStatus.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return APPROVED;
        }
    }
}
