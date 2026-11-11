package com.charityapp.service.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.charityapp.dto.logistics.LogisticsEoDSubmitRequest;
import com.charityapp.dto.logistics.StockAdjustmentRequest;
import com.charityapp.dto.logistics.TransferRequest;
import com.charityapp.dto.sync.OfflineMutationDto;
import com.charityapp.dto.sync.SyncBatchRequest;
import com.charityapp.dto.sync.SyncBatchResponse;
import com.charityapp.model.finance.*;
import com.charityapp.model.hr.VolunteerFeedback;
import com.charityapp.model.sync.IdempotencyKey;
import com.charityapp.repository.finance.DonationPickupRepository;
import com.charityapp.repository.sync.IdempotencyKeyRepository;
import com.charityapp.service.finance.FinanceService;
import com.charityapp.service.hr.HrService;
import com.charityapp.service.logistics.LogisticsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SyncBatchService {

    private static final Logger log = LoggerFactory.getLogger(SyncBatchService.class);

    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final LogisticsService logisticsService;
    private final FinanceService financeService;
    private final HrService hrService;
    private final DonationPickupRepository donationPickupRepository;
    private final ObjectMapper objectMapper;

    public SyncBatchService(
            IdempotencyKeyRepository idempotencyKeyRepository,
            LogisticsService logisticsService,
            FinanceService financeService,
            HrService hrService,
            DonationPickupRepository donationPickupRepository,
            ObjectMapper objectMapper) {
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.logisticsService = logisticsService;
        this.financeService = financeService;
        this.hrService = hrService;
        this.donationPickupRepository = donationPickupRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SyncBatchResponse processBatch(SyncBatchRequest request) {
        List<String> processed = new ArrayList<>();
        List<Map<String, Object>> conflicts = new ArrayList<>();

        if (request == null || request.getMutations() == null || request.getMutations().isEmpty()) {
            return new SyncBatchResponse(processed, conflicts);
        }

        // Sort chronologically by client timestamp
        List<OfflineMutationDto> sorted = new ArrayList<>(request.getMutations());
        sorted.sort(Comparator.comparing(m -> m.getTimestamp() != null ? m.getTimestamp() : 0L));

        for (OfflineMutationDto mutation : sorted) {
            String mutationId = mutation.getId();
            if (mutationId == null || mutationId.isBlank()) {
                continue;
            }

            // 1. Idempotency pre-check
            if (idempotencyKeyRepository.findByKey(mutationId).isPresent()) {
                processed.add(mutationId);
                continue;
            }

            try {
                boolean success = executeMutation(mutation);
                if (success) {
                    idempotencyKeyRepository.save(new IdempotencyKey(
                            mutationId,
                            mutation.getUrl() != null ? mutation.getUrl() : "/api/sync/batch",
                            200,
                            "{\"processed\":true}"
                    ));
                    processed.add(mutationId);
                } else {
                    conflicts.add(Map.of("id", mutationId, "error", "Execution failed"));
                }
            } catch (Exception e) {
                log.warn("Error processing offline mutation {}: {}", mutationId, e.getMessage());
                conflicts.add(Map.of("id", mutationId, "error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
                // Also record key so faulty mutation does not block subsequent runs
                idempotencyKeyRepository.save(new IdempotencyKey(
                        mutationId,
                        mutation.getUrl() != null ? mutation.getUrl() : "/api/sync/batch",
                        400,
                        "{\"error\":\"" + (e.getMessage() != null ? e.getMessage().replace("\"", "'") : "error") + "\"}"
                ));
                processed.add(mutationId);
            }
        }

        return new SyncBatchResponse(processed, conflicts);
    }

    private boolean executeMutation(OfflineMutationDto mutation) throws Exception {
        String url = mutation.getUrl();
        String method = mutation.getMethod() != null ? mutation.getMethod().toUpperCase() : "POST";
        Object body = mutation.getBody();

        if (url == null) return false;

        // --- Logistics ---
        if (url.contains("/api/admin/logistics/transfers") || url.contains("/api/logistics/transfers")) {
            TransferRequest req = convertBody(body, TransferRequest.class);
            logisticsService.executeTransfer(req);
            return true;
        }

        if (url.contains("/api/admin/logistics/adjustments") || url.contains("/api/logistics/adjustments")) {
            StockAdjustmentRequest req = convertBody(body, StockAdjustmentRequest.class);
            logisticsService.adjustStock(req);
            return true;
        }

        if (url.contains("/api/admin/logistics/eod") || url.contains("/api/logistics/eod")) {
            LogisticsEoDSubmitRequest req = convertBody(body, LogisticsEoDSubmitRequest.class);
            logisticsService.submitEoDReport(req);
            return true;
        }

        // --- Finance ---
        if (url.contains("/api/admin/finances/expenses") || url.contains("/api/finances/expenses")) {
            FinanceExpense exp = convertBody(body, FinanceExpense.class);
            financeService.createExpense(exp);
            return true;
        }

        if (url.contains("/api/admin/finances/stands") || url.contains("/api/finances/stands")) {
            FinanceStand stand = convertBody(body, FinanceStand.class);
            financeService.submitStandEoD(stand);
            return true;
        }

        if (url.contains("/api/admin/finances/online-donations") || url.contains("/api/finances/online-donations")) {
            FinanceOnlineDonation don = convertBody(body, FinanceOnlineDonation.class);
            financeService.recordOnlineDonation(don);
            return true;
        }

        if (url.contains("/api/admin/finances/sponsorships") || url.contains("/api/finances/sponsorships")) {
            FinanceSponsorship spon = convertBody(body, FinanceSponsorship.class);
            financeService.createSponsorship(spon);
            return true;
        }

        if (url.contains("/api/admin/finances/other-incomes") || url.contains("/api/finances/other-incomes")) {
            FinanceOtherIncome inc = convertBody(body, FinanceOtherIncome.class);
            financeService.createOtherIncome(inc);
            return true;
        }

        // --- Donations ---
        Pattern donationPickupPattern = Pattern.compile(".*/api/donations/(\\d+)/pickup.*");
        Matcher donationMatcher = donationPickupPattern.matcher(url);
        if (donationMatcher.matches()) {
            Long donationId = Long.parseLong(donationMatcher.group(1));
            boolean status = true;
            if (body instanceof Boolean) {
                status = (Boolean) body;
            } else if (body instanceof Map) {
                Object s = ((Map<?, ?>) body).get("status");
                if (s instanceof Boolean) status = (Boolean) s;
            }
            donationPickupRepository.setPickupStatus(donationId, status);
            return true;
        }

        // --- HR ---
        if (url.contains("/feedback/submit") || url.contains("/feedback")) {
            VolunteerFeedback fb = convertBody(body, VolunteerFeedback.class);
            hrService.submitVolunteerFeedback(fb);
            return true;
        }

        if (url.contains("/attendance/gps-checkin")) {
            Map<?, ?> map = convertBody(body, Map.class);
            Double lat = map.get("latitude") != null ? Double.parseDouble(map.get("latitude").toString()) : null;
            Double lng = map.get("longitude") != null ? Double.parseDouble(map.get("longitude").toString()) : null;
            UUID standId = map.get("standId") != null ? UUID.fromString(map.get("standId").toString()) : null;
            UUID shiftId = map.get("shiftId") != null ? UUID.fromString(map.get("shiftId").toString()) : null;
            UUID userId = map.get("userId") != null ? UUID.fromString(map.get("userId").toString()) : null;
            String email = map.get("email") != null ? map.get("email").toString() : null;
            hrService.recordGpsAttendance(userId, email, standId, shiftId, lat, lng);
            return true;
        }

        if (url.contains("/attendance/qr-checkin")) {
            Map<?, ?> map = convertBody(body, Map.class);
            String qrToken = map.get("qrToken") != null ? map.get("qrToken").toString() : null;
            UUID standId = map.get("standId") != null ? UUID.fromString(map.get("standId").toString()) : null;
            UUID shiftId = map.get("shiftId") != null ? UUID.fromString(map.get("shiftId").toString()) : null;
            UUID userId = map.get("userId") != null ? UUID.fromString(map.get("userId").toString()) : null;
            String email = map.get("email") != null ? map.get("email").toString() : null;
            hrService.recordQrAttendance(userId, email, qrToken, standId, shiftId);
            return true;
        }

        Pattern hrAttendancePattern = Pattern.compile(".*/api/(?:admin/)?hr/assignments/([a-fA-F0-9-]+)/attendance.*");
        Matcher hrAttMatcher = hrAttendancePattern.matcher(url);
        if (hrAttMatcher.matches()) {
            UUID assignmentId = UUID.fromString(hrAttMatcher.group(1));
            Map<?, ?> map = convertBody(body, Map.class);
            String status = map.get("status") != null ? map.get("status").toString() : "CONFIRMED";
            hrService.updateAttendance(assignmentId, status);
            return true;
        }

        Pattern hrEodPattern = Pattern.compile(".*/api/(?:admin/)?hr/assignments/([a-fA-F0-9-]+)/eod-submit.*");
        Matcher hrEodMatcher = hrEodPattern.matcher(url);
        if (hrEodMatcher.matches()) {
            UUID assignmentId = UUID.fromString(hrEodMatcher.group(1));
            Map<?, ?> map = convertBody(body, Map.class);
            String locationName = (String) map.get("locationName");
            String eventDateStr = (String) map.get("eventDate");
            LocalDate eventDate = eventDateStr != null ? LocalDate.parse(eventDateStr) : LocalDate.now();
            String shiftName = (String) map.get("shiftName");
            String financeResponsibleName = (String) map.get("financeResponsibleName");
            BigDecimal cashCollected = map.get("cashCollected") != null ? new BigDecimal(map.get("cashCollected").toString()) : BigDecimal.ZERO;
            BigDecimal posCardCollected = map.get("posCardCollected") != null ? new BigDecimal(map.get("posCardCollected").toString()) : BigDecimal.ZERO;
            BigDecimal openingBalance = map.get("openingBalance") != null ? new BigDecimal(map.get("openingBalance").toString()) : BigDecimal.ZERO;
            BigDecimal closingBalance = map.get("closingBalance") != null ? new BigDecimal(map.get("closingBalance").toString()) : BigDecimal.ZERO;
            BigDecimal discrepancyAmount = map.get("discrepancyAmount") != null ? new BigDecimal(map.get("discrepancyAmount").toString()) : BigDecimal.ZERO;
            String discrepancyNotes = (String) map.get("discrepancyNotes");

            hrService.submitEoDForm(assignmentId, locationName, eventDate, shiftName,
                    financeResponsibleName, cashCollected, posCardCollected, openingBalance, closingBalance,
                    discrepancyAmount, discrepancyNotes);
            return true;
        }

        log.info("Batch mutation unhandled by specific handler: URL={} METHOD={}", url, method);
        return true;
    }

    private <T> T convertBody(Object body, Class<T> clazz) {
        if (body == null) return null;
        if (clazz.isInstance(body)) {
            return clazz.cast(body);
        }
        return objectMapper.convertValue(body, clazz);
    }
}
