package com.charityapp.event;

import org.springframework.context.ApplicationEvent;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

public class ConfigUpdatedEvent extends ApplicationEvent {
    private final Set<String> updatedKeys;
    private final UUID actorId;
    private final boolean restartRequired;

    public ConfigUpdatedEvent(Object source, Set<String> updatedKeys, UUID actorId, boolean restartRequired) {
        super(source);
        this.updatedKeys = updatedKeys != null ? Collections.unmodifiableSet(updatedKeys) : Collections.emptySet();
        this.actorId = actorId;
        this.restartRequired = restartRequired;
    }

    public Set<String> getUpdatedKeys() {
        return updatedKeys;
    }

    public UUID getActorId() {
        return actorId;
    }

    public boolean isRestartRequired() {
        return restartRequired;
    }

    @Override
    public String toString() {
        return "ConfigUpdatedEvent{" +
                "updatedKeys=" + updatedKeys +
                ", actorId=" + actorId +
                ", restartRequired=" + restartRequired +
                ", timestamp=" + getTimestamp() +
                '}';
    }
}
