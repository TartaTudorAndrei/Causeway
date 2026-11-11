package com.charityapp.config;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AuditAspect;
import com.charityapp.config.Auditable;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.service.general.AuditLogService;
import com.charityapp.service.auth.JwtService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditAspectTest {
    private AuditLogRepository auditLogRepository;
    private AdminUserRepository userRepository;
    private AuditLogService auditLogService;
    private JwtService jwtService;
    private AuditAspect auditAspect;

    private UUID actorId;
    private String actorEmail;
    private String validToken;

    @BeforeEach
    void setUp() {
        auditLogRepository = mock(AuditLogRepository.class);
        userRepository = mock(AdminUserRepository.class);
        auditLogService = new AuditLogService(auditLogRepository, userRepository);
        jwtService = new JwtService("test_super_secret_jwt_key_that_is_at_least_32_bytes_long_12345", 8);
        auditAspect = new AuditAspect(auditLogService, jwtService);

        actorId = UUID.randomUUID();
        actorEmail = "test@example.org";
        validToken = jwtService.generateToken(actorId, actorEmail, "ADMIN");

        AdminUser mockUser = new AdminUser("Test Actor", actorEmail, "hash", AdminStatus.APPROVED, AdminRole.ADMIN);
        mockUser.setId(actorId);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(mockUser));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void testLogAuditAfterReturning() {
        // Setup mock request context
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + validToken);
        request.addHeader("User-Agent", "Mozilla/5.0");
        request.setRemoteAddr("192.168.1.100");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        // Setup mock JoinPoint and Annotation
        JoinPoint joinPoint = mock(JoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.getParameterNames()).thenReturn(new String[]{"projectId"});
        UUID projectId = UUID.randomUUID();
        when(joinPoint.getArgs()).thenReturn(new Object[]{projectId});

        Auditable auditable = mock(Auditable.class);
        when(auditable.action()).thenReturn("CREATE_EXPENSE");
        when(auditable.resourceType()).thenReturn("expense");
        when(auditable.resourceIdParam()).thenReturn("");

        // Act (execute the aspect's after-returning advice)
        auditAspect.logAudit(joinPoint, auditable, "result_success");

        // Assert
        ArgumentCaptor<AuditLog> logCaptor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, timeout(1000)).save(logCaptor.capture());
        
        AuditLog savedLog = logCaptor.getValue();
        assertNotNull(savedLog);
        assertEquals(actorId, savedLog.getActorId());
        assertEquals(actorEmail, savedLog.getActorEmail());
        assertEquals("CREATE_EXPENSE", savedLog.getAction());
        assertEquals("expense", savedLog.getResourceType());
        assertEquals("192.168.1.100", savedLog.getIpAddress());
        assertEquals("Mozilla/5.0", savedLog.getUserAgent());
        assertTrue(savedLog.getStateChanges().contains("result_success"));
    }

    @Test
    void testLogAuditWithCookieAuth() {
        // Setup mock request context with cookie instead of Authorization header
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie("adminToken", validToken));
        request.addHeader("User-Agent", "Mozilla/5.0");
        request.setRemoteAddr("10.0.0.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        // Setup mock JoinPoint and Annotation
        JoinPoint joinPoint = mock(JoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.getParameterNames()).thenReturn(new String[]{"projectId"});
        UUID projectId = UUID.randomUUID();
        when(joinPoint.getArgs()).thenReturn(new Object[]{projectId});

        Auditable auditable = mock(Auditable.class);
        when(auditable.action()).thenReturn("UPDATE_SETTING");
        when(auditable.resourceType()).thenReturn("settings");
        when(auditable.resourceIdParam()).thenReturn("");

        // Act
        auditAspect.logAudit(joinPoint, auditable, "result_ok");

        // Assert
        ArgumentCaptor<AuditLog> logCaptor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, timeout(1000)).save(logCaptor.capture());

        AuditLog savedLog = logCaptor.getValue();
        assertNotNull(savedLog);
        assertEquals(actorId, savedLog.getActorId());
        assertEquals(actorEmail, savedLog.getActorEmail());
        assertEquals("UPDATE_SETTING", savedLog.getAction());
    }
}
