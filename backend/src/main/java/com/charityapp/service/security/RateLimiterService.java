package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService implements RateLimiter {

    public static final int LOGIN_MAX_FAILURES = 5;
    public static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    public static final int TWO_FACTOR_MAX_FAILURES = 3;

    public static final int FORGOT_PASSWORD_MAX_REQUESTS = 3;
    public static final Duration FORGOT_PASSWORD_WINDOW = Duration.ofMinutes(15);

    public static final int REQUEST_ACCESS_MAX_REQUESTS = 10;
    public static final Duration REQUEST_ACCESS_WINDOW = Duration.ofMinutes(15);

    public static final int PUBLIC_STAND_SIGNUP_MAX_REQUESTS = 10;
    public static final Duration PUBLIC_STAND_SIGNUP_WINDOW = Duration.ofMinutes(15);

    public static final int PUBLIC_FEEDBACK_MAX_REQUESTS = 10;
    public static final Duration PUBLIC_FEEDBACK_WINDOW = Duration.ofMinutes(15);

    private final Map<String, List<Instant>> bucketAttempts = new ConcurrentHashMap<>();
    private final Map<String, Integer> tokenFailures = new ConcurrentHashMap<>();

    public boolean isAllowed(String bucket, String key, int maxAllowed, Duration window) {
        String fullKey = bucket + ":" + (key != null ? key.trim().toLowerCase() : "unknown");
        List<Instant> timestamps = bucketAttempts.get(fullKey);
        if (timestamps == null) {
            return true;
        }

        Instant cutoff = Instant.now().minus(window);
        synchronized (timestamps) {
            long recentCount = timestamps.stream().filter(t -> t.isAfter(cutoff)).count();
            return recentCount < maxAllowed;
        }
    }

    public void recordEvent(String bucket, String key) {
        String fullKey = bucket + ":" + (key != null ? key.trim().toLowerCase() : "unknown");
        bucketAttempts.compute(fullKey, (k, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ArrayList<>();
            }
            synchronized (timestamps) {
                timestamps.add(Instant.now());
            }
            return timestamps;
        });
    }

    public void reset(String bucket, String key) {
        String fullKey = bucket + ":" + (key != null ? key.trim().toLowerCase() : "unknown");
        bucketAttempts.remove(fullKey);
    }

    // --- High-level helper methods ---

    public boolean isLoginAllowed(String ip, String email) {
        String key = (ip != null ? ip : "") + "|" + (email != null ? email.trim().toLowerCase() : "");
        return isAllowed("login", key, LOGIN_MAX_FAILURES, LOGIN_WINDOW);
    }

    public void recordLoginFailure(String ip, String email) {
        String key = (ip != null ? ip : "") + "|" + (email != null ? email.trim().toLowerCase() : "");
        recordEvent("login", key);
    }

    public void resetLogin(String ip, String email) {
        String key = (ip != null ? ip : "") + "|" + (email != null ? email.trim().toLowerCase() : "");
        reset("login", key);
    }

    public boolean isTwoFactorAllowed(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) return false;
        int failures = tokenFailures.getOrDefault(sessionToken.trim(), 0);
        return failures < TWO_FACTOR_MAX_FAILURES;
    }

    public int recordTwoFactorFailure(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) return TWO_FACTOR_MAX_FAILURES;
        return tokenFailures.compute(sessionToken.trim(), (k, count) -> (count == null ? 1 : count + 1));
    }

    public void resetTwoFactor(String sessionToken) {
        if (sessionToken != null) {
            tokenFailures.remove(sessionToken.trim());
        }
    }

    public boolean isForgotPasswordAllowed(String email) {
        return isAllowed("forgot_password", email, FORGOT_PASSWORD_MAX_REQUESTS, FORGOT_PASSWORD_WINDOW);
    }

    public void recordForgotPasswordAttempt(String email) {
        recordEvent("forgot_password", email);
    }

    public boolean isRequestAccessAllowed(String ip) {
        return isAllowed("request_access", ip, REQUEST_ACCESS_MAX_REQUESTS, REQUEST_ACCESS_WINDOW);
    }

    public void recordRequestAccessAttempt(String ip) {
        recordEvent("request_access", ip);
    }

    public boolean isPublicStandSignupAllowed(String ip) {
        return isAllowed("stand_signup", ip, PUBLIC_STAND_SIGNUP_MAX_REQUESTS, PUBLIC_STAND_SIGNUP_WINDOW);
    }

    public void recordPublicStandSignupAttempt(String ip) {
        recordEvent("stand_signup", ip);
    }

    public boolean isPublicFeedbackAllowed(String ip) {
        return isAllowed("feedback_submit", ip, PUBLIC_FEEDBACK_MAX_REQUESTS, PUBLIC_FEEDBACK_WINDOW);
    }

    public void recordPublicFeedbackAttempt(String ip) {
        recordEvent("feedback_submit", ip);
    }

    @Scheduled(fixedRate = 60000)
    public void cleanupExpiredEntries() {
        Instant now = Instant.now();
        Instant maxCutoff = now.minus(Duration.ofHours(2));

        Iterator<Map.Entry<String, List<Instant>>> iterator = bucketAttempts.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, List<Instant>> entry = iterator.next();
            List<Instant> list = entry.getValue();
            synchronized (list) {
                list.removeIf(t -> t.isBefore(maxCutoff));
                if (list.isEmpty()) {
                    iterator.remove();
                }
            }
        }
    }
}
