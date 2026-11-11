package com.charityapp.controller.admin;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.service.general.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogController {
    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @RequirePermission(code = "it:audit:read", anyOf = {"it:read", "audit:read", "it:audit:view"})
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(auditLogService.getLogs(department, action, search, limit));
    }

    @PostMapping
    @RequirePermission(code = "it:audit:write", anyOf = {"it:write", "audit:write"})
    public ResponseEntity<AuditLog> recordAuditLog(@RequestBody AuditLog log, HttpServletRequest request) {
        if (log.getIpAddress() == null || log.getIpAddress().isBlank()) {
            String xfHeader = request.getHeader("X-Forwarded-For");
            log.setIpAddress(xfHeader != null ? xfHeader.split(",")[0].trim() : request.getRemoteAddr());
        }
        if (log.getUserAgent() == null || log.getUserAgent().isBlank()) {
            log.setUserAgent(request.getHeader("User-Agent"));
        }
        return ResponseEntity.ok(auditLogService.recordLog(log));
    }
}
