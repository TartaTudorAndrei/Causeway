package com.charityapp.event;

public class DashboardDataChangedEvent {
    private final String domain;
    private final String action;
    private final long timestamp;

    public DashboardDataChangedEvent(String domain, String action) {
        this.domain = domain;
        this.action = action;
        this.timestamp = System.currentTimeMillis();
    }

    public String getDomain() {
        return domain;
    }

    public String getAction() {
        return action;
    }

    public long getTimestamp() {
        return timestamp;
    }

    @Override
    public String toString() {
        return "DashboardDataChangedEvent{" +
                "domain='" + domain + '\'' +
                ", action='" + action + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
