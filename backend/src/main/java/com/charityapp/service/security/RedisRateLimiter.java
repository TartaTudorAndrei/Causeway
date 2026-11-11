package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@ConditionalOnProperty(name = "app.rate-limiter.type", havingValue = "redis")
public class RedisRateLimiter implements RateLimiter {

    @Override
    public boolean isAllowed(String bucket, String key, int maxAllowed, Duration window) {
        throw new UnsupportedOperationException(
            "Redis rate limiter not yet implemented. Set app.rate-limiter.type=memory or implement Redis backend."
        );
    }

    @Override
    public void recordEvent(String bucket, String key) {
        throw new UnsupportedOperationException("Redis rate limiter not yet implemented.");
    }

    @Override
    public void reset(String bucket, String key) {
        throw new UnsupportedOperationException("Redis rate limiter not yet implemented.");
    }
}
