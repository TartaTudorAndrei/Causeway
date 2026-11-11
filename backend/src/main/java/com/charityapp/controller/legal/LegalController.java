package com.charityapp.controller.legal;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.legal.GenerateContractRequest;
import com.charityapp.dto.legal.GoogleDocImportRequest;
import com.charityapp.dto.legal.GoogleDocImportResponse;
import com.charityapp.dto.legal.LegalStatsDTO;
import com.charityapp.model.legal.ContractTemplate;
import com.charityapp.model.legal.GeneratedContract;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.legal.LegalService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/legal")
public class LegalController {

    private static final Logger log = LoggerFactory.getLogger(LegalController.class);
    private final LegalService legalService;
    private final JwtService jwtService;

    public LegalController(LegalService legalService, JwtService jwtService) {
        this.legalService = legalService;
        this.jwtService = jwtService;
    }

    // ================= TEMPLATES =================

    @GetMapping("/templates")
    @RequirePermission(code = "legal:templates:read", anyOf = {"legal:contract:read", "legal:templates:view", "legal:read"})
    public ResponseEntity<List<ContractTemplate>> getAllTemplates() {
        try {
            return ResponseEntity.ok(legalService.getAllTemplates());
        } catch (Exception e) {
            log.error("Failed to retrieve contract templates: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/templates/{id}")
    @RequirePermission(code = "legal:templates:read", anyOf = {"legal:contract:read", "legal:templates:view", "legal:read"})
    public ResponseEntity<ContractTemplate> getTemplateById(@PathVariable UUID id) {
        try {
            ContractTemplate template = legalService.getTemplateById(id);
            if (template == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(template);
        } catch (Exception e) {
            log.error("Failed to retrieve contract template {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/templates")
    @RequirePermission(code = "legal:templates:write", anyOf = {"legal:contract:write", "legal:write"})
    public ResponseEntity<?> createTemplate(@RequestBody ContractTemplate template) {
        try {
            ContractTemplate created = legalService.createTemplate(template);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.error("Failed to create contract template: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating contract template: " + e.getMessage());
        }
    }

    @PutMapping("/templates/{id}")
    @RequirePermission(code = "legal:templates:write", anyOf = {"legal:contract:write", "legal:write"})
    public ResponseEntity<?> updateTemplate(@PathVariable UUID id, @RequestBody ContractTemplate template) {
        try {
            ContractTemplate updated = legalService.updateTemplate(id, template);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Failed to update contract template {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating contract template: " + e.getMessage());
        }
    }

    @DeleteMapping("/templates/{id}")
    @RequirePermission(code = "legal:templates:delete", anyOf = {"legal:templates:write", "legal:contract:write", "legal:write"})
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        try {
            legalService.deleteTemplate(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Failed to delete contract template {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/templates/import-doc")
    @RequirePermission(code = "legal:templates:import:write", anyOf = {"legal:templates:write", "legal:contract:write", "legal:write"})
    public ResponseEntity<?> importGoogleDoc(@RequestBody GoogleDocImportRequest request) {
        try {
            GoogleDocImportResponse response = legalService.importDocument(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to import document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Import failed: " + e.getMessage());
        }
    }

    @PostMapping("/templates/detect-fields")
    @RequirePermission(code = "legal:templates:write", anyOf = {"legal:contract:write", "legal:write"})
    public ResponseEntity<List<String>> detectFields(@RequestBody Map<String, String> payload) {
        try {
            String content = payload.getOrDefault("content", "");
            List<String> detected = legalService.detectFieldKeys(content);
            return ResponseEntity.ok(detected);
        } catch (Exception e) {
            log.error("Failed to detect fields: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ================= CONTRACTS =================

    @GetMapping("/contracts")
    @RequirePermission(code = "legal:contracts:read", anyOf = {"legal:contract:read", "legal:contracts:view", "legal:read"})
    public ResponseEntity<List<GeneratedContract>> getAllContracts() {
        try {
            return ResponseEntity.ok(legalService.getAllContracts());
        } catch (Exception e) {
            log.error("Failed to retrieve generated contracts: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/contracts/{id}")
    @RequirePermission(code = "legal:contracts:read", anyOf = {"legal:contract:read", "legal:contracts:view", "legal:read"})
    public ResponseEntity<GeneratedContract> getContractById(@PathVariable UUID id) {
        try {
            GeneratedContract contract = legalService.getContractById(id);
            if (contract == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(contract);
        } catch (Exception e) {
            log.error("Failed to retrieve contract {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/contracts/generate")
    @RequirePermission(code = "legal:contracts:write", anyOf = {"legal:contracts:generator:write", "legal:contract:write", "legal:write"})
    public ResponseEntity<?> generateContract(
            @RequestBody GenerateContractRequest request,
            HttpServletRequest httpRequest) {
        try {
            String token = extractToken(httpRequest);
            String userEmail = token != null ? jwtService.extractEmail(token) : null;
            if (userEmail == null || userEmail.isBlank()) {
                userEmail = "admin@charity.org";
            }
            GeneratedContract generated = legalService.generateContract(request, userEmail);
            return ResponseEntity.ok(generated);
        } catch (Exception e) {
            log.error("Failed to generate contract: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating contract: " + e.getMessage());
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

    @PutMapping("/contracts/{id}")
    @RequirePermission(code = "legal:contracts:write", anyOf = {"legal:contract:write", "legal:write"})
    public ResponseEntity<?> updateContract(@PathVariable UUID id, @RequestBody GeneratedContract contract) {
        try {
            GeneratedContract updated = legalService.updateContract(id, contract);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Failed to update contract {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating contract: " + e.getMessage());
        }
    }

    @GetMapping("/contracts/{id}/pdf")
    @RequirePermission(code = "legal:contracts:pdf:export", anyOf = {"legal:contracts:read", "legal:contract:read", "legal:read"})
    public ResponseEntity<byte[]> getContractPdf(@PathVariable UUID id) {
        try {
            GeneratedContract contract = legalService.getContractById(id);
            if (contract == null) {
                return ResponseEntity.notFound().build();
            }
            byte[] pdfBytes = legalService.getContractPdfBytes(id);
            if (pdfBytes == null || pdfBytes.length == 0) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            }

            String filename = (contract.getContractNumber() != null ? contract.getContractNumber() : "contract") + ".pdf";
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"" + filename + "\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Failed to retrieve contract PDF for {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/contracts/{id}")
    @RequirePermission(code = "legal:contracts:delete", anyOf = {"legal:contracts:write", "legal:contract:write", "legal:write"})
    public ResponseEntity<Void> deleteContract(@PathVariable UUID id) {
        try {
            legalService.deleteContract(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Failed to delete contract {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/google-status")
    @RequirePermission(code = "legal:contracts:read", anyOf = {"legal:contract:read", "legal:read"})
    public ResponseEntity<Map<String, Object>> getGoogleStatus() {
        try {
            return ResponseEntity.ok(legalService.getGoogleStatus());
        } catch (Exception e) {
            log.error("Failed to get Google status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stats")
    @RequirePermission(code = "legal:statistics:read", anyOf = {"legal:contract:read", "legal:statistics:view", "legal:read"})
    public ResponseEntity<LegalStatsDTO> getStats() {
        try {
            return ResponseEntity.ok(legalService.getStats());
        } catch (Exception e) {
            log.error("Failed to retrieve legal statistics: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
