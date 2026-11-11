package com.charityapp.service.general;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;
    private final AdminUserRepository userRepository;

    public AuditLogService(AuditLogRepository auditLogRepository, AdminUserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Async
    public void log(UUID actorId, String action, String resourceType, UUID resourceId,
                    ScopeType scopeType, UUID scopeId, String stateChanges,
                    String ipAddress, String userAgent) {
        
        String email = "system@example.org";
        String name = "Sistem Platformă";
        if (actorId != null) {
            AdminUser user = userRepository.findById(actorId).orElse(null);
            if (user != null) {
                email = user.getEmail();
                name = user.getFullName();
            } else {
                email = "admin@example.org";
                name = "Administrator";
            }
        }

        AuditLog log = new AuditLog(
            actorId,
            email,
            name,
            "GENERAL",
            action,
            resourceType,
            resourceId,
            resourceType != null ? resourceType : "Resource",
            "Acțiune " + action + " pe " + resourceType,
            scopeType != null ? scopeType : ScopeType.GLOBAL,
            scopeId,
            stateChanges,
            ipAddress,
            userAgent
        );

        auditLogRepository.save(log);
    }

    public AuditLog recordLog(AuditLog log) {
        if (log.getActorEmail() == null || log.getActorEmail().isBlank()) {
            if (log.getActorId() != null) {
                userRepository.findById(log.getActorId()).ifPresent(user -> {
                    log.setActorEmail(user.getEmail());
                    if (log.getActorName() == null || log.getActorName().isBlank()) {
                        log.setActorName(user.getFullName());
                    }
                });
            }
            if (log.getActorEmail() == null || log.getActorEmail().isBlank()) {
                log.setActorEmail("admin@example.org");
            }
        }
        if (log.getActorName() == null || log.getActorName().isBlank()) {
            log.setActorName("Administrator");
        }
        return auditLogRepository.save(log);
    }

    public List<AuditLog> getLogs(String department, String action, String search, Integer limit) {
        return auditLogRepository.findWithFilters(department, action, search, limit);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }
}
