package com.charityapp.dto.finance;

public class PaymentCheckoutResult {
    private final String sessionId;
    private final String url;

    public PaymentCheckoutResult(String sessionId, String url) {
        this.sessionId = sessionId;
        this.url = url;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getUrl() {
        return url;
    }
}
