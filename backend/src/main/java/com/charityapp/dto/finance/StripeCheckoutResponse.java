package com.charityapp.dto.finance;

public class StripeCheckoutResponse {

    private final String sessionId;
    private final String url;

    public StripeCheckoutResponse(String sessionId, String url) {
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

