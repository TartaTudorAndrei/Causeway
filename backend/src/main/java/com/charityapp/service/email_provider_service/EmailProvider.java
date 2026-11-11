package com.charityapp.service.email_provider_service;

public interface EmailProvider {
    void sendPickupCodeEmail(String to, String pickupCode, double amount) throws Exception;
}
