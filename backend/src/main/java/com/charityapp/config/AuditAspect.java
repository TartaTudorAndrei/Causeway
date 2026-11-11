package com.charityapp.config;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.ScopeType;
import com.charityapp.service.general.AuditLogService;
import com.google.gson.Gson;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.charityapp.service.auth.JwtService;

import java.util.UUID;

@Aspect
@Component
public class AuditAspect {
    private final AuditLogService auditLogService;
    private final JwtService jwtService;
    private final Gson gson = new Gson();

    public AuditAspect(AuditLogService auditLogService, JwtService jwtService) {
        this.auditLogService = auditLogService;
        this.jwtService = jwtService;
    }

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void logAudit(JoinPoint joinPoint, Auditable auditable, Object result) {
        HttpServletRequest request = getRequest();
        if (request == null) return;

        // 1. Extract Actor from header or cookie
        UUID actorId = null;
        String token = extractToken(request);
        if (token != null && !token.isBlank()) {
            actorId = jwtService.extractUserId(token);
        }

        // 2. Extract client IP and user agent
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        // 3. Extract Resource ID
        UUID resourceId = null;
        String resourceIdParam = auditable.resourceIdParam();
        if (!resourceIdParam.isEmpty()) {
            resourceId = extractUuidFromArgs(joinPoint, resourceIdParam);
        }

        // 4. Extract Scope parameters if present in method arguments
        UUID projectId = extractUuidFromArgs(joinPoint, "projectId");
        UUID departmentId = extractUuidFromArgs(joinPoint, "departmentId");
        
        ScopeType scopeType = ScopeType.GLOBAL;
        UUID scopeId = null;
        
        if (projectId != null) {
            scopeType = ScopeType.PROJECT;
            scopeId = projectId;
        } else if (departmentId != null) {
            scopeType = ScopeType.DEPARTMENT;
            scopeId = departmentId;
        }

        // 5. Serialize parameters/result as state changes
        String stateChanges = null;
        try {
            stateChanges = gson.toJson(result != null ? result : joinPoint.getArgs());
        } catch (Exception e) {
            stateChanges = "{\"error\": \"Serialization failed\"}";
        }

        // 6. Log asynchronously
        auditLogService.log(
            actorId,
            auditable.action(),
            auditable.resourceType(),
            resourceId,
            scopeType,
            scopeId,
            stateChanges,
            ip,
            ua
        );
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
        return attributes != null ? attributes.getRequest() : null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    private UUID extractUuidFromArgs(JoinPoint joinPoint, String paramName) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] parameterNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        if (parameterNames != null) {
            for (int i = 0; i < parameterNames.length; i++) {
                if (parameterNames[i].equals(paramName)) {
                    Object arg = args[i];
                    if (arg instanceof UUID) {
                        return (UUID) arg;
                    } else if (arg instanceof String) {
                        try {
                            return UUID.fromString((String) arg);
                        } catch (IllegalArgumentException e) {
                            return null;
                        }
                    }
                }
            }
        }
        return null;
    }
}
