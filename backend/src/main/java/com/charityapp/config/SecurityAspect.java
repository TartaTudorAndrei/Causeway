package com.charityapp.config;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.security.SecurityEvaluator;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Aspect
@Component
public class SecurityAspect {
    private final SecurityEvaluator securityEvaluator;
    private final JwtService jwtService;
    private final AdminUserRepository adminUserRepository;
    private final com.charityapp.service.auth.SessionManagerService sessionManagerService;

    @org.springframework.beans.factory.annotation.Autowired
    public SecurityAspect(SecurityEvaluator securityEvaluator,
                          JwtService jwtService,
                          AdminUserRepository adminUserRepository,
                          @org.springframework.beans.factory.annotation.Autowired(required = false)
                          com.charityapp.service.auth.SessionManagerService sessionManagerService) {
        this.securityEvaluator = securityEvaluator;
        this.jwtService = jwtService;
        this.adminUserRepository = adminUserRepository;
        this.sessionManagerService = sessionManagerService;
    }

    public SecurityAspect(SecurityEvaluator securityEvaluator,
                          JwtService jwtService,
                          AdminUserRepository adminUserRepository) {
        this(securityEvaluator, jwtService, adminUserRepository, null);
    }

    @Before("@annotation(requirePermission)")
    public void checkPermission(JoinPoint joinPoint, RequirePermission requirePermission) {
        HttpServletRequest request = getRequest();
        HttpServletResponse response = getResponse();
        
        // 1. Validate auth token
        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Lipsă token autentificare.");
        }

        UUID userId = jwtService.extractUserId(token);
        if (userId == null) {
            clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid sau expirat.");
        }

        // 2. Validate user status and token version (Server-side revocation)
        AdminUser user = adminUserRepository.findById(userId)
            .orElseThrow(() -> {
                clearAuthCookies(response);
                return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilizator necunoscut.");
            });

        if (user.getStatus() != AdminStatus.APPROVED) {
            clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contul nu este activ.");
        }

        Integer tokenVersion = jwtService.extractTokenVersion(token);
        if (tokenVersion != null && tokenVersion < user.getTokenVersion()) {
            clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token revocat. Reconectați-vă.");
        }

        if (sessionManagerService != null) {
            String tokenHash = sha256(token);
            if (!sessionManagerService.isSessionValid(tokenHash)) {
                clearAuthCookies(response);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
            }
        }

        // 3. Extract Scope ID if configured
        UUID scopeId = null;
        String paramName = requirePermission.scopeIdParam();
        if (!paramName.isEmpty()) {
            scopeId = extractScopeIdFromArgs(joinPoint, paramName);
        }

        // 4. Evaluate permission
        boolean hasPermission = false;
        String primaryCode = requirePermission.code();
        if (primaryCode != null && !primaryCode.isBlank()) {
            hasPermission = securityEvaluator.hasPermission(
                userId,
                primaryCode,
                requirePermission.scopeType(),
                scopeId
            );
        }

        if (!hasPermission && requirePermission.anyOf() != null) {
            for (String altCode : requirePermission.anyOf()) {
                if (altCode != null && !altCode.isBlank()) {
                    if (securityEvaluator.hasPermission(userId, altCode, requirePermission.scopeType(), scopeId)) {
                        hasPermission = true;
                        break;
                    }
                }
            }
        }

        if (!hasPermission) {
            String requiredNotice = (primaryCode != null && !primaryCode.isBlank())
                ? primaryCode
                : String.join(", ", requirePermission.anyOf());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuzat: lipsă permisiune " + requiredNotice);
        }
    }

    private String extractToken(HttpServletRequest request) {
        if (request == null) return null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("adminToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private HttpServletRequest getRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            throw new IllegalStateException("RequestContext is not active.");
        }
        return attributes.getRequest();
    }

    private HttpServletResponse getResponse() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getResponse() : null;
    }

    private void clearAuthCookies(HttpServletResponse response) {
        if (response == null) return;
        ResponseCookie cookie = ResponseCookie.from("adminToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        ResponseCookie clearRefresh = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());
    }

    private UUID extractScopeIdFromArgs(JoinPoint joinPoint, String paramName) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] parameterNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        if (parameterNames != null) {
            for (int i = 0; i < parameterNames.length; i++) {
                if (parameterNames[i].equals(paramName)) {
                    Object arg = args[i];
                    if (arg == null) {
                        return null;
                    }
                    if (arg instanceof UUID) {
                        return (UUID) arg;
                    } else if (arg instanceof String) {
                        try {
                            return UUID.fromString((String) arg);
                        } catch (IllegalArgumentException e) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificator invalid pentru scop: " + paramName);
                        }
                    }
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tip nesuportat pentru identificatorul de scop: " + paramName);
                }
            }
        }
        return null;
    }

    private String sha256(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
