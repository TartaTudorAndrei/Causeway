package com.charityapp.model.auth;

public enum AdminRole {
    ADMIN,
    IT_ADMIN,
    FINANCE_HEAD,
    FINANCE_MEMBER,
    MARKETING_HEAD,
    MARKETING_MEMBER,
    FUNDRAISING_HEAD,
    FUNDRAISING_MEMBER,
    LOGISTICS_HEAD,
    LOGISTICS_MEMBER,
    HR_HEAD,
    HR_MEMBER,
    LEGAL_HEAD,
    LEGAL_MEMBER,
    VOLUNTEER,
    CUSTOMER;

    public static AdminRole fromString(String val) {
        if (val == null || val.isBlank()) return VOLUNTEER;
        String trimmed = val.trim().toUpperCase();
        if ("SUPER_ADMIN".equals(trimmed)) return ADMIN;
        try {
            return AdminRole.valueOf(trimmed);
        } catch (IllegalArgumentException e) {
            return "CUSTOMER".equals(trimmed) ? CUSTOMER : VOLUNTEER;
        }
    }
}
