package com.charityapp.dto.config;

public class TestConnectionResponse {
    private boolean success;
    private String message;
    private String details;

    public TestConnectionResponse() {}

    public TestConnectionResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public TestConnectionResponse(boolean success, String message, String details) {
        this.success = success;
        this.message = message;
        this.details = details;
    }

    public static TestConnectionResponse ok(String message) {
        return new TestConnectionResponse(true, message);
    }

    public static TestConnectionResponse ok(String message, String details) {
        return new TestConnectionResponse(true, message, details);
    }

    public static TestConnectionResponse fail(String message) {
        return new TestConnectionResponse(false, message);
    }

    public static TestConnectionResponse fail(String message, String details) {
        return new TestConnectionResponse(false, message, details);
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}
