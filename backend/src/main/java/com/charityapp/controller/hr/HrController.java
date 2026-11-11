package com.charityapp.controller.hr;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.model.finance.FinanceStand;
import com.charityapp.model.hr.*;
import com.charityapp.service.hr.HrService;
import com.charityapp.service.security.RateLimiterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/hr")
public class HrController {

    private final HrService hrService;
    private final RateLimiterService rateLimiterService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.charityapp.service.auth.JwtService jwtService;

    public HrController(HrService hrService, RateLimiterService rateLimiterService) {
        this.hrService = hrService;
        this.rateLimiterService = rateLimiterService;
    }

    // --- 1. STANDS & SHIFTS ---
    @GetMapping("/stands")
    @RequirePermission(code = "hr:stands:read", anyOf = {"hr:stand:read", "hr:stands:view", "general:read", "general:calendar:read", "general:calendar:view", "general:tasks:view", "finance:read", "finance:expense:read", "finance:expense:write", "logistics:read", "logistics:inventory:read", "logistics:inventory:write"})
    public ResponseEntity<List<HrStand>> getStands() {
        return ResponseEntity.ok(hrService.getAllStands());
    }

    @GetMapping("/stands/{id}")
    public ResponseEntity<HrStand> getStandById(@PathVariable String id) {
        HrStand stand = hrService.getStandById(id);
        if (stand == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(stand);
    }

    /**
     * Deliberately unauthenticated — public volunteer signup endpoint.
     * Protected by: rate limiting (Phase 3) + CAPTCHA.
     */
    @PostMapping("/stands/{standId}/public-signup")
    public ResponseEntity<Map<String, Object>> publicStandSignup(@PathVariable String standId,
                                                                 @RequestBody Map<String, String> body,
                                                                 jakarta.servlet.http.HttpServletRequest request) {
        try {
            String ip = getClientIp(request);
            if (!rateLimiterService.isPublicStandSignupAllowed(ip)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("success", false, "message", "Prea multe încercări de înscriere de la această adresă IP. Vă rugăm să încercați mai târziu."));
            }
            rateLimiterService.recordPublicStandSignupAttempt(ip);

            String fullName = body.get("fullName");
            String email = body.get("email");
            String password = body.get("password");
            String phone = body.get("phone");
            String orgType = body.get("orgType");
            if (orgType == null) orgType = body.get("organizationType");
            String orgDetails = body.get("orgDetails");
            if (orgDetails == null) orgDetails = body.get("organizationDetails");
            UUID shiftId = UUID.fromString(body.get("shiftId"));
            UUID roleId = UUID.fromString(body.get("roleId"));
            String availability = body.get("availability");

            String ua = request.getHeader("User-Agent");
            String origin = request.getHeader("Origin");

            Map<String, Object> result = hrService.publicHrStandSignup(
                    standId, fullName, email, password, phone, orgType, orgDetails,
                    shiftId, roleId, availability, ip, ua, origin
            );
            if (Boolean.FALSE.equals(result.get("success"))) {
                return ResponseEntity.badRequest().body(result);
            }
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/stands")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stands:write", "hr:stand:write", "hr:write"})
    public ResponseEntity<HrStand> createStand(@RequestBody HrStand stand) {
        return ResponseEntity.ok(hrService.createStand(stand));
    }

    @PutMapping("/stands/{id}")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stands:write", "hr:stand:write", "hr:write"})
    public ResponseEntity<Void> updateStand(@PathVariable String id, @RequestBody HrStand stand) {
        HrStand existing = hrService.getStandById(id);
        if (existing == null) return ResponseEntity.notFound().build();
        hrService.updateStand(existing.getId(), stand);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/stands/{id}/copy")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stands:write", "hr:stand:write", "hr:write"})
    public ResponseEntity<HrStand> copyStand(@PathVariable String id) {
        HrStand existing = hrService.getStandById(id);
        if (existing == null) return ResponseEntity.notFound().build();
        HrStand copied = hrService.copyStand(existing.getId());
        return ResponseEntity.ok(copied);
    }

    @DeleteMapping("/stands/{id}")
    @RequirePermission(code = "hr:stands:shifts:delete", anyOf = {"hr:stands:delete", "hr:stand:delete", "hr:stand:write", "hr:write"})
    public ResponseEntity<Void> deleteStand(@PathVariable String id) {
        HrStand existing = hrService.getStandById(id);
        if (existing != null) {
            hrService.deleteStand(existing.getId());
        } else {
            try {
                hrService.deleteStand(UUID.fromString(id));
            } catch (Exception ignored) {}
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/stands/{standId}/shifts")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<HrShift> addShiftToStand(@PathVariable String standId, @RequestBody HrShift shift) {
        HrStand stand = hrService.getStandById(standId);
        if (stand == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(hrService.addShiftToStand(stand.getId(), shift));
    }

    @PutMapping("/shifts/{shiftId}")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<HrShift> updateShift(@PathVariable UUID shiftId, @RequestBody HrShift shift) {
        return ResponseEntity.ok(hrService.updateShift(shiftId, shift));
    }

    @DeleteMapping("/shifts/{shiftId}")
    @RequirePermission(code = "hr:stands:shifts:delete", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> deleteShift(@PathVariable UUID shiftId) {
        hrService.deleteShift(shiftId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/shifts/{shiftId}/assignments")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<?> assignMember(@PathVariable UUID shiftId,
                                          @RequestBody Map<String, String> body) {
        try {
            UUID memberId = UUID.fromString(body.get("memberId"));
            UUID roleId = UUID.fromString(body.get("roleId"));
            return ResponseEntity.ok(hrService.assignMemberToShift(shiftId, memberId, roleId));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> removeAssignment(@PathVariable UUID assignmentId) {
        hrService.removeAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/assignments/{assignmentId}/approve")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> approveAssignment(@PathVariable UUID assignmentId,
                                                  jakarta.servlet.http.HttpServletRequest request) {
        UUID actorId = null;
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ") && jwtService != null) {
                actorId = jwtService.extractUserId(authHeader.substring(7));
            }
        } catch (Exception ignored) {}
        hrService.approveShiftAssignment(assignmentId, actorId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/assignments/{assignmentId}/reject")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> rejectAssignment(@PathVariable UUID assignmentId) {
        hrService.rejectShiftAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/assignments/{assignmentId}/attendance")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> updateAttendance(@PathVariable UUID assignmentId,
                                                 @RequestBody Map<String, String> body) {
        String status = body.get("status");
        hrService.updateAttendance(assignmentId, status);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stands/{standId}/qr-code")
    @RequirePermission(code = "hr:stands:read", anyOf = {"hr:stand:read", "hr:read"})
    public ResponseEntity<?> getStandQrCode(@PathVariable String standId) {
        try {
            HrStand stand = hrService.getStandById(standId);
            if (stand == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(hrService.getStandQrCodeInfo(stand.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/attendance/gps-checkin")
    @RequirePermission(code = "hr:attendance:write")
    public ResponseEntity<?> gpsCheckin(@RequestBody Map<String, Object> body,
                                        jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> authUser = extractAuthUser(request);
        UUID userId = (UUID) authUser.get("userId");
        String email = (String) authUser.get("email");

        if (userId == null && (email == null || email.isBlank())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Trebuie să fii autentificat pentru a confirma prezența."));
        }

        try {
            Double lat = body.get("latitude") != null ? Double.parseDouble(body.get("latitude").toString()) : null;
            Double lng = body.get("longitude") != null ? Double.parseDouble(body.get("longitude").toString()) : null;

            UUID standId = null;
            if (body.get("standId") != null && !body.get("standId").toString().isBlank()) {
                standId = UUID.fromString(body.get("standId").toString());
            }

            UUID shiftId = null;
            if (body.get("shiftId") != null && !body.get("shiftId").toString().isBlank()) {
                shiftId = UUID.fromString(body.get("shiftId").toString());
            }

            Map<String, Object> result = hrService.recordGpsAttendance(userId, email, standId, shiftId, lat, lng);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // --- 2. QR CODE SCAN & VALIDATION ---
    @PostMapping("/attendance/qr-checkin")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:attendance:write"})
    public ResponseEntity<?> qrCheckin(@RequestBody Map<String, Object> body,
                                       jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> authUser = extractAuthUser(request);
        UUID userId = (UUID) authUser.get("userId");
        String email = (String) authUser.get("email");

        if (userId == null && (email == null || email.isBlank())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Trebuie să fii autentificat pentru a confirma prezența."));
        }

        try {
            String token = (String) body.get("token");
            if (token == null || token.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Codul QR este obligatoriu."));
            }

            UUID standId = null;
            if (body.get("standId") != null && !body.get("standId").toString().isBlank()) {
                standId = UUID.fromString(body.get("standId").toString());
            }
            UUID shiftId = null;
            if (body.get("shiftId") != null && !body.get("shiftId").toString().isBlank()) {
                shiftId = UUID.fromString(body.get("shiftId").toString());
            }

            Map<String, Object> result = hrService.recordQrAttendance(userId, email, token, standId, shiftId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // --- 2. END OF DAY FORM (SYNC TO FINANCES STANDS SHEET) ---
    @PostMapping("/assignments/{assignmentId}/eod-submit")
    @RequirePermission(code = "hr:stand:write")
    public ResponseEntity<FinanceStand> submitStandEoD(@PathVariable UUID assignmentId,
                                                       @RequestBody Map<String, Object> body) {
        String locationName = (String) body.get("locationName");
        String eventDateStr = (String) body.get("eventDate");
        LocalDate eventDate = eventDateStr != null ? LocalDate.parse(eventDateStr) : LocalDate.now();
        String shiftName = (String) body.get("shiftName");
        String financeResponsibleName = (String) body.get("financeResponsibleName");

        BigDecimal cashCollected = body.get("cashCollected") != null ? new BigDecimal(body.get("cashCollected").toString()) : BigDecimal.ZERO;
        BigDecimal posCardCollected = body.get("posCardCollected") != null ? new BigDecimal(body.get("posCardCollected").toString()) : BigDecimal.ZERO;
        BigDecimal openingBalance = body.get("openingBalance") != null ? new BigDecimal(body.get("openingBalance").toString()) : BigDecimal.ZERO;
        BigDecimal closingBalance = body.get("closingBalance") != null ? new BigDecimal(body.get("closingBalance").toString()) : BigDecimal.ZERO;
        BigDecimal discrepancyAmount = body.get("discrepancyAmount") != null ? new BigDecimal(body.get("discrepancyAmount").toString()) : BigDecimal.ZERO;
        String discrepancyNotes = (String) body.get("discrepancyNotes");

        FinanceStand result = hrService.submitEoDForm(assignmentId, locationName, eventDate, shiftName,
                financeResponsibleName, cashCollected, posCardCollected, openingBalance, closingBalance,
                discrepancyAmount, discrepancyNotes);

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/assignments/{assignmentId}/eod-submit")
    @RequirePermission(code = "hr:stand:write")
    public ResponseEntity<Void> deleteStandEoD(@PathVariable UUID assignmentId) {
        hrService.deleteEoD(assignmentId);
        return ResponseEntity.noContent().build();
    }

    // --- 3. ROLES DIRECTORY ---
    @GetMapping("/roles")
    public ResponseEntity<List<HrStandRole>> getStandRoles() {
        return ResponseEntity.ok(hrService.getAllStandRoles());
    }

    @PostMapping("/roles")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<HrStandRole> createStandRole(@RequestBody HrStandRole role) {
        return ResponseEntity.ok(hrService.createStandRole(role));
    }

    @PutMapping("/roles/{id}")
    @RequirePermission(code = "hr:stands:shifts:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> updateStandRole(@PathVariable UUID id, @RequestBody HrStandRole role) {
        hrService.updateStandRole(id, role);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/roles/{id}")
    @RequirePermission(code = "hr:stands:shifts:delete", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> deleteStandRole(@PathVariable UUID id) {
        hrService.deleteStandRole(id);
        return ResponseEntity.noContent().build();
    }

    // --- 3.5. STAND LOCATIONS ---
    @GetMapping("/locations")
    @RequirePermission(code = "hr:stands:locations:read", anyOf = {"hr:stand:read", "hr:read"})
    public ResponseEntity<List<HrLocation>> getLocations() {
        return ResponseEntity.ok(hrService.getAllLocations());
    }

    @PostMapping("/locations")
    @RequirePermission(code = "hr:stands:locations:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<HrLocation> createLocation(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        return ResponseEntity.ok(hrService.createLocation(name));
    }

    @PutMapping("/locations/{id}")
    @RequirePermission(code = "hr:stands:locations:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<HrLocation> updateLocation(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String name = body.get("name");
        HrLocation updated = hrService.updateLocation(id, name);
        if (updated == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/locations/{id}")
    @RequirePermission(code = "hr:stands:locations:delete", anyOf = {"hr:stands:locations:write", "hr:stand:write", "hr:write"})
    public ResponseEntity<?> deleteLocation(@PathVariable UUID id) {
        try {
            hrService.deleteLocation(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    // --- 4. TEAM & MEMBER DIRECTORY ---
    @GetMapping("/members")
    @RequirePermission(code = "hr:members:read", anyOf = {"hr:stand:read", "general:read", "general:task:read", "general:task:write", "general:tasks:read", "general:tasks:write", "general:tasks:view", "hr:read"})
    public ResponseEntity<List<HrMember>> getMembers() {
        return ResponseEntity.ok(hrService.getAllMembers());
    }

    @GetMapping("/members/{id}")
    @RequirePermission(code = "hr:members:read", anyOf = {"hr:stand:read", "general:read", "general:task:read", "general:task:write", "general:tasks:read", "general:tasks:write", "general:tasks:view", "hr:read"})
    public ResponseEntity<HrMember> getMemberById(@PathVariable UUID id) {
        HrMember member = hrService.getMemberById(id);
        if (member == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(member);
    }

    @PostMapping("/members")
    @RequirePermission(code = "hr:members:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<HrMember> createMember(@RequestBody HrMember member) {
        return ResponseEntity.ok(hrService.createMember(member));
    }

    @PutMapping("/members/{id}")
    @RequirePermission(code = "hr:members:write", anyOf = {"hr:stand:write", "hr:write"})
    public ResponseEntity<Void> updateMember(@PathVariable UUID id, @RequestBody HrMember member) {
        hrService.updateMember(id, member);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/members/{id}")
    @RequirePermission(code = "hr:members:delete", anyOf = {"hr:members:write", "hr:stand:write", "hr:write"})
    public ResponseEntity<Void> deleteMember(@PathVariable UUID id) {
        hrService.deleteMember(id);
        return ResponseEntity.noContent().build();
    }

    // --- 5. STATISTICS ---
    @GetMapping("/stats")
    @RequirePermission(code = "hr:statistics:read", anyOf = {"hr:stand:read", "hr:statistics:view", "hr:read"})
    public ResponseEntity<HrStats> getStats() {
        return ResponseEntity.ok(hrService.getStats());
    }

    // --- 6. FEEDBACK & COMPLAINTS SYSTEM ---
    @GetMapping("/feedback/categories")
    @RequirePermission(code = "hr:feedback:read", anyOf = {"hr:feedback:view", "hr:feedback:manage", "hr:read"})
    public ResponseEntity<List<HrFeedbackCategory>> getFeedbackCategories() {
        return ResponseEntity.ok(hrService.getFeedbackCategories());
    }

    @PostMapping("/feedback/categories")
    @RequirePermission(code = "hr:feedback:manage", anyOf = {"hr:write"})
    public ResponseEntity<HrFeedbackCategory> createFeedbackCategory(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        return ResponseEntity.ok(hrService.createFeedbackCategory(name));
    }

    @PutMapping("/feedback/categories/{id}")
    @RequirePermission(code = "hr:feedback:manage", anyOf = {"hr:write"})
    public ResponseEntity<HrFeedbackCategory> updateFeedbackCategory(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String name = body.get("name");
        return ResponseEntity.ok(hrService.updateFeedbackCategory(id, name));
    }

    @DeleteMapping("/feedback/categories/{id}")
    @RequirePermission(code = "hr:feedback:delete", anyOf = {"hr:feedback:manage", "hr:write"})
    public ResponseEntity<Void> deleteFeedbackCategory(@PathVariable UUID id) {
        hrService.deleteFeedbackCategory(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/feedback/submit")
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @RequestBody VolunteerFeedback payload,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        Map<String, Object> authUser = extractAuthUser(request);
        UUID authUserId = (UUID) authUser.get("userId");
        String authEmail = (String) authUser.get("email");

        // Bot / Honeypot / Rate limiting protection for public submissions
        if (Boolean.TRUE.equals(payload.getIsPublicSubmission()) || authUserId == null) {
            String ip = getClientIp(request);
            if (!rateLimiterService.isPublicFeedbackAllowed(ip)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("success", false, "message", "Prea multe trimiteri de feedback de la această adresă IP. Vă rugăm să încercați mai târziu."));
            }
            rateLimiterService.recordPublicFeedbackAttempt(ip);
            payload.setIsPublicSubmission(true);
        }

        // Handle user linking if identified and logged in
        if (Boolean.FALSE.equals(payload.getIsAnonymous()) && authUserId != null) {
            payload.setUserId(authUserId);
            if (payload.getSubmitterEmail() == null || payload.getSubmitterEmail().isBlank()) {
                payload.setSubmitterEmail(authEmail);
            }
        }

        VolunteerFeedback created = hrService.submitVolunteerFeedback(payload);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "feedback", created,
                "message", "Feedback-ul a fost trimis cu succes. Îți mulțumim pentru implicare!"
        ));
    }

    @GetMapping("/feedback")
    @RequirePermission(code = "hr:feedback:view")
    public ResponseEntity<List<VolunteerFeedback>> getFeedbackList(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean isAnonymous,
            @RequestParam(required = false) Boolean isPublicSubmission,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDate sDate = (startDate != null && !startDate.isBlank()) ? LocalDate.parse(startDate) : null;
        LocalDate eDate = (endDate != null && !endDate.isBlank()) ? LocalDate.parse(endDate) : null;
        return ResponseEntity.ok(hrService.getVolunteerFeedbackList(status, type, categoryId, isAnonymous, isPublicSubmission, search, sDate, eDate));
    }

    @GetMapping("/feedback/summary")
    @RequirePermission(code = "hr:feedback:view")
    public ResponseEntity<com.charityapp.dto.hr.FeedbackSummaryDto> getFeedbackSummary(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDate sDate = (startDate != null && !startDate.isBlank()) ? LocalDate.parse(startDate) : null;
        LocalDate eDate = (endDate != null && !endDate.isBlank()) ? LocalDate.parse(endDate) : null;
        return ResponseEntity.ok(hrService.getFeedbackSummary(sDate, eDate));
    }

    @PutMapping("/feedback/{id}/status")
    @RequirePermission(code = "hr:feedback:manage")
    public ResponseEntity<Void> updateFeedbackStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        String status = body.get("status");
        String categoryIdStr = body.get("categoryId");
        UUID categoryId = (categoryIdStr != null && !categoryIdStr.isBlank()) ? UUID.fromString(categoryIdStr) : null;
        String internalNotes = body.get("internalNotes");
        Map<String, Object> authUser = extractAuthUser(request);
        UUID resolverId = (UUID) authUser.get("userId");

        hrService.updateVolunteerFeedback(id, status, categoryId, internalNotes, resolverId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/feedback/{id}")
    @RequirePermission(code = "hr:feedback:delete")
    public ResponseEntity<Void> deleteFeedback(@PathVariable UUID id) {
        hrService.deleteVolunteerFeedback(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> extractAuthUser(jakarta.servlet.http.HttpServletRequest request) {
        if (jwtService == null || request == null) return Map.of();
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("adminToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        if (token == null || token.isBlank()) return Map.of();
        try {
            UUID userId = jwtService.extractUserId(token);
            String email = jwtService.extractEmail(token);
            Map<String, Object> user = new java.util.HashMap<>();
            if (userId != null) user.put("userId", userId);
            if (email != null) user.put("email", email);
            return user;
        } catch (Exception ignored) {}
        return Map.of();
    }

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        if (request == null) return "unknown";
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
