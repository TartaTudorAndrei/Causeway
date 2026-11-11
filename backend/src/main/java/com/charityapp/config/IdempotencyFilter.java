package com.charityapp.config;

import com.charityapp.model.sync.IdempotencyKey;
import com.charityapp.repository.sync.IdempotencyKeyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class IdempotencyFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyFilter.class);
    private static final String IDEMPOTENCY_HEADER = "X-Idempotency-Key";

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private static final Set<String> EXCLUDED_PATHS = Set.of(
            "/api/admin/login",
            "/api/admin/auth/google",
            "/api/admin/auth/refresh",
            "/api/admin/2fa",
            "/api/webhooks",
            "/api/stripe/webhook",
            "/api/admin/finances/expenses/scan-receipt" // Large multipart uploads
    );

    private final IdempotencyKeyRepository idempotencyKeyRepository;

    public IdempotencyFilter(IdempotencyKeyRepository idempotencyKeyRepository) {
        this.idempotencyKeyRepository = idempotencyKeyRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String method = request.getMethod().toUpperCase();
        String uri = request.getRequestURI();

        if (!MUTATING_METHODS.contains(method) || isExcluded(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        String idempotencyKey = request.getHeader(IDEMPOTENCY_HEADER);
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Check if previously executed and cached
        Optional<IdempotencyKey> existing = idempotencyKeyRepository.findByKey(idempotencyKey.trim());
        if (existing.isPresent()) {
            IdempotencyKey keyRecord = existing.get();
            response.setStatus(keyRecord.getResponseStatus());
            response.setContentType("application/json;charset=UTF-8");
            response.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENCY");
            if (keyRecord.getResponseBody() != null) {
                response.getWriter().write(keyRecord.getResponseBody());
            }
            return;
        }

        // Wrap response to capture output for caching
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        try {
            filterChain.doFilter(request, responseWrapper);
        } finally {
            int status = responseWrapper.getStatus();
            // Cache successful or conflict responses (200-299, 409)
            if ((status >= 200 && status < 300) || status == 409) {
                try {
                    byte[] content = responseWrapper.getContentAsByteArray();
                    String body = content.length > 0 ? new String(content, StandardCharsets.UTF_8) : "";
                    
                    IdempotencyKey newRecord = new IdempotencyKey(
                            idempotencyKey.trim(),
                            uri,
                            status,
                            body
                    );
                    idempotencyKeyRepository.save(newRecord);
                } catch (Exception e) {
                    log.warn("Failed to persist idempotency key {}: {}", idempotencyKey, e.getMessage());
                }
            }

            responseWrapper.copyBodyToResponse();
        }
    }

    private boolean isExcluded(String uri) {
        if (uri == null) return false;
        for (String prefix : EXCLUDED_PATHS) {
            if (uri.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Nightly cleanup of idempotency keys older than 7 days.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupOldKeys() {
        try {
            Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
            int deleted = idempotencyKeyRepository.deleteOlderThan(cutoff);
            if (deleted > 0) {
                log.info("Purged {} expired idempotency keys older than 7 days.", deleted);
            }
        } catch (Exception e) {
            log.error("Failed to clean up old idempotency keys: {}", e.getMessage());
        }
    }
}
