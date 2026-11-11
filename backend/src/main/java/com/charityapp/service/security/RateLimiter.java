package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import java.time.Duration;

/**
 * Rate limiting contract. Default implementation is in-memory.
 * Swap to Redis-backed implementation when deploying multiple instances.
 */
public interface RateLimiter {
    boolean isAllowed(String bucket, String key, int maxAllowed, Duration window);
    void recordEvent(String bucket, String key);
    void reset(String bucket, String key);
}
