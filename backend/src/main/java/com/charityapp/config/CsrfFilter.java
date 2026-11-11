package com.charityapp.config;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.security.CsrfTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class CsrfFilter extends OncePerRequestFilter {

    private static final String CSRF_COOKIE_NAME = "XSRF-TOKEN";
    private static final String CSRF_HEADER_NAME = "X-XSRF-TOKEN";

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    /**
     * Paths exempt from CSRF validation (unauthenticated or webhook endpoints).
     */
    private static final Set<String> EXEMPT_PATH_PREFIXES = Set.of(
        "/api/admin/login",
        "/api/admin/request-access",
        "/api/admin/forgot-password",
        "/api/admin/reset-password",
        "/api/admin/validate-reset-token",
        "/api/admin/verify-email",
        "/api/admin/auth/google",
        "/api/admin/auth/refresh",
        "/api/admin/2fa",
        "/api/public/account/auth/",
        "/api/admin/hr/stands/",
        "/api/hr/stands/",
        "/api/sync",
        "/api/admin/sync/batch",
        "/api/webhooks",
        "/api/stripe"
    );

    private final CsrfTokenService csrfTokenService;

    public CsrfFilter(CsrfTokenService csrfTokenService) {
        this.csrfTokenService = csrfTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        // Always ensure CSRF cookie exists on response
        ensureCsrfCookie(request, response);

        // Safe methods and exempt paths skip validation
        if (SAFE_METHODS.contains(request.getMethod().toUpperCase())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isExempt(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Validate CSRF token
        String cookieToken = extractCsrfCookie(request);
        String headerToken = request.getHeader(CSRF_HEADER_NAME);

        if (cookieToken == null || headerToken == null
                || !csrfTokenService.validateToken(cookieToken, headerToken)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"CSRF token invalid sau lipsă.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void ensureCsrfCookie(HttpServletRequest request, HttpServletResponse response) {
        String existingToken = extractCsrfCookie(request);
        if (existingToken == null || existingToken.isBlank()) {
            String newToken = csrfTokenService.generateToken();

            String proto = request.getHeader("X-Forwarded-Proto");
            String host = request.getHeader("Host");
            boolean isSecure = request.isSecure()
                    || "https".equalsIgnoreCase(proto)
                    || (host != null && !host.contains("localhost"));

            Cookie cookie = new Cookie(CSRF_COOKIE_NAME, newToken);
            cookie.setPath("/");
            cookie.setHttpOnly(false); // Must be readable by frontend JS
            cookie.setSecure(isSecure);
            cookie.setMaxAge(8 * 60 * 60); // Match session duration
            response.addCookie(cookie);
        }
    }

    private String extractCsrfCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (CSRF_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private boolean isExempt(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) return false;

        for (String prefix : EXEMPT_PATH_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }

        // Public stand signup: POST /api/admin/hr/stands/{id}/public-signup
        if (path.matches("/api/(?:admin/)?hr/stands/[^/]+/public-signup")) {
            return true;
        }

        return false;
    }
}
