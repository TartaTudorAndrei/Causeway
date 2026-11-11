package com.charityapp.config;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.config.SecurityAspect;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.security.SecurityEvaluator;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.repository.auth.AdminUserRepository;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SecurityAspectTest {
    private SecurityEvaluator securityEvaluator;
    private JwtService jwtService;
    private AdminUserRepository adminUserRepository;
    private SecurityAspect securityAspect;

    private UUID userId;
    private String validToken;

    @BeforeEach
    void setUp() {
        securityEvaluator = mock(SecurityEvaluator.class);
        jwtService = new JwtService("charity_test_secret_key_for_jwt_which_is_at_least_32_bytes_long", 8);
        adminUserRepository = mock(AdminUserRepository.class);
        securityAspect = new SecurityAspect(securityEvaluator, jwtService, adminUserRepository);

        userId = UUID.randomUUID();
        validToken = jwtService.generateToken(userId, "admin@example.org", "ADMIN");

        AdminUser mockUser = new AdminUser("Admin", "admin@example.org", "pass", AdminStatus.APPROVED, AdminRole.ADMIN);
        mockUser.setId(userId);
        mockUser.setTokenVersion(0);
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(mockUser));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void testValidTokenAndPermissionAllowsAccess() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + validToken);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission requirePermission = mock(RequirePermission.class);
        when(requirePermission.code()).thenReturn("finance:expense:read");
        when(requirePermission.scopeType()).thenReturn(ScopeType.GLOBAL);
        when(requirePermission.scopeIdParam()).thenReturn("");

        when(securityEvaluator.hasPermission(userId, "finance:expense:read", ScopeType.GLOBAL, null))
                .thenReturn(true);

        assertDoesNotThrow(() -> securityAspect.checkPermission(joinPoint, requirePermission));
    }

    @Test
    void testMissingTokenThrowsUnauthorized() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission requirePermission = mock(RequirePermission.class);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> securityAspect.checkPermission(joinPoint, requirePermission));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void testLegacyMockTokenRejectedAsUnauthorized() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer jwt-mock-" + userId + "-12345678");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission requirePermission = mock(RequirePermission.class);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> securityAspect.checkPermission(joinPoint, requirePermission));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void testForbiddenWhenPermissionMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + validToken);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        JoinPoint joinPoint = mock(JoinPoint.class);
        RequirePermission requirePermission = mock(RequirePermission.class);
        when(requirePermission.code()).thenReturn("admin:write");
        when(requirePermission.scopeType()).thenReturn(ScopeType.GLOBAL);
        when(requirePermission.scopeIdParam()).thenReturn("");

        when(securityEvaluator.hasPermission(userId, "admin:write", ScopeType.GLOBAL, null))
                .thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> securityAspect.checkPermission(joinPoint, requirePermission));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }
}
