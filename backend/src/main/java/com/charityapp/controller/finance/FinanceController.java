package com.charityapp.controller.finance;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.finance.ScannedExpenseDto;
import com.charityapp.model.finance.*;
import com.charityapp.service.finance.FinanceService;
import com.charityapp.service.finance.GeminiReceiptScannerService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/finances")
public class FinanceController {
    private final FinanceService financeService;
    private final GeminiReceiptScannerService receiptScannerService;
    private final com.charityapp.service.google.GoogleDriveService googleDriveService;

    public FinanceController(
            FinanceService financeService,
            GeminiReceiptScannerService receiptScannerService,
            @org.springframework.context.annotation.Lazy com.charityapp.service.google.GoogleDriveService googleDriveService) {
        this.financeService = financeService;
        this.receiptScannerService = receiptScannerService;
        this.googleDriveService = googleDriveService;
    }

    // --- 1. EXPENSES ---
    @PostMapping(value = "/expenses/scan-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequirePermission(code = "finance:expenses:ai_scan:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<ScannedExpenseDto> scanReceipt(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "categories", required = false) List<String> categories) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fișierul încărcat este gol.");
        }
        try {
            java.util.Set<String> allCategories = new java.util.LinkedHashSet<>();
            if (categories != null) {
                for (String c : categories) {
                    if (c != null && !c.isBlank()) {
                        allCategories.add(c.trim());
                    }
                }
            }
            List<String> dbCategories = financeService.getExpenseCategories();
            if (dbCategories != null) {
                allCategories.addAll(dbCategories);
            }

            byte[] fileBytes = file.getBytes();
            String contentType = file.getContentType();
            String originalFilename = file.getOriginalFilename();

            ScannedExpenseDto scanned = receiptScannerService.scanReceipt(
                    fileBytes,
                    contentType,
                    originalFilename,
                    new java.util.ArrayList<>(allCategories)
            );

            // Auto-upload scanned receipt/invoice to Google Drive receipts_invoices folder with format DATE_EXPENSE_NAME_NUMBER
            if (googleDriveService != null) {
                try {
                    String driveLink = googleDriveService.uploadScannedReceipt(
                            fileBytes,
                            contentType,
                            originalFilename,
                            scanned.getTransactionDate(),
                            scanned.getName()
                    );
                    if (driveLink != null && !driveLink.isBlank()) {
                        scanned.setReceiptUrl(driveLink);
                        scanned.setReceiptAttachment(driveLink);
                    }
                } catch (Exception e) {
                    // Log upload error and continue gracefully so AI scan results still return
                }
            }

            return ResponseEntity.ok(scanned);
        } catch (IOException e) {
            throw new RuntimeException("Eroare la citirea fișierului: " + e.getMessage(), e);
        }
    }

    @PostMapping("/expenses/scan-drive-receipt")
    @RequirePermission(code = "finance:expenses:ai_scan:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<ScannedExpenseDto> scanDriveReceipt(@RequestBody Map<String, Object> payload) {
        String fileUrlOrId = payload != null && payload.get("fileUrlOrId") != null ? payload.get("fileUrlOrId").toString() : null;
        if (fileUrlOrId == null || fileUrlOrId.isBlank()) {
            throw new IllegalArgumentException("Specificați link-ul sau ID-ul fișierului Google Drive.");
        }

        List<String> categories = null;
        if (payload != null && payload.get("categories") instanceof List<?>) {
            categories = ((List<?>) payload.get("categories")).stream()
                    .filter(Objects::nonNull)
                    .map(Object::toString)
                    .toList();
        }

        List<String> dbCategories = financeService.getExpenseCategories();
        ScannedExpenseDto result = googleDriveService.processDriveReceipt(
                fileUrlOrId,
                categories,
                receiptScannerService,
                dbCategories
        );

        return ResponseEntity.ok(result);
    }

    @GetMapping("/expenses/drive-receipts")
    @RequirePermission(code = "finance:expenses:read", anyOf = {"finance:expense:read", "finance:expenses:view", "finance:read"})
    public ResponseEntity<List<com.charityapp.dto.sync.DriveReceiptFileDto>> getDriveReceiptFiles() {
        if (googleDriveService == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(googleDriveService.listRecentDriveReceiptFiles());
    }

    @GetMapping("/expenses")
    @RequirePermission(code = "finance:expenses:read", anyOf = {"finance:expense:read", "finance:expenses:view", "finance:read"})
    public ResponseEntity<List<FinanceExpense>> getExpenses() {
        return ResponseEntity.ok(financeService.getExpenses());
    }

    @PostMapping("/expenses")
    @RequirePermission(code = "finance:expenses:write", anyOf = {"finance:expense:write", "finance:write"})
    public ResponseEntity<FinanceExpense> createExpense(@RequestBody FinanceExpense expense) {
        return ResponseEntity.ok(financeService.createExpense(expense));
    }

    @PutMapping("/expenses/{id}")
    @RequirePermission(code = "finance:expenses:write", anyOf = {"finance:expense:write", "finance:write"})
    public ResponseEntity<Void> updateExpense(@PathVariable UUID id, @RequestBody FinanceExpense expense) {
        expense.setId(id);
        financeService.updateExpense(expense);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/expenses/{id}")
    @RequirePermission(code = "finance:expenses:delete", anyOf = {"finance:expenses:write", "finance:expense:delete", "finance:expense:write", "finance:write"})
    public ResponseEntity<Void> deleteExpense(@PathVariable UUID id) {
        financeService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }

    // --- 2. ONLINE DONATIONS ---
    @GetMapping("/online-donations")
    @RequirePermission(code = "finance:donations:read", anyOf = {"finance:onlinedonations:view", "finance:expenses:read", "finance:expense:read", "finance:read", "donations:read"})
    public ResponseEntity<List<FinanceOnlineDonation>> getOnlineDonations() {
        return ResponseEntity.ok(financeService.getOnlineDonations());
    }

    @PostMapping("/online-donations")
    @RequirePermission(code = "finance:donations:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write", "donations:write"})
    public ResponseEntity<FinanceOnlineDonation> recordOnlineDonation(@RequestBody FinanceOnlineDonation donation) {
        return ResponseEntity.ok(financeService.recordOnlineDonation(donation));
    }

    // --- 3. STANDS ---
    @GetMapping("/stands")
    @RequirePermission(code = "finance:stands:read", anyOf = {"finance:stands:view", "finance:expenses:read", "finance:expense:read", "finance:read", "hr:stand:read"})
    public ResponseEntity<List<FinanceStand>> getStands() {
        return ResponseEntity.ok(financeService.getStands());
    }

    @PostMapping("/stands")
    @RequirePermission(code = "finance:stands:eod:write", anyOf = {"finance:stands:cash:approve", "finance:stand:handover", "finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<FinanceStand> submitStandEoD(@RequestBody FinanceStand stand) {
        return ResponseEntity.ok(financeService.submitStandEoD(stand));
    }

    @PutMapping("/stands/{id}")
    @RequirePermission(code = "finance:stands:eod:write", anyOf = {"finance:stands:cash:approve", "finance:stand:handover", "finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<Void> updateStand(@PathVariable UUID id, @RequestBody FinanceStand stand) {
        stand.setId(id);
        financeService.updateStand(stand);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/stands/{id}")
    @RequirePermission(code = "finance:stands:eod:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<Void> deleteStand(@PathVariable UUID id) {
        financeService.deleteStand(id);
        return ResponseEntity.noContent().build();
    }

    // --- 4. SPONSORSHIPS ---
    @GetMapping("/sponsorships")
    @RequirePermission(code = "finance:sponsorships:read", anyOf = {"finance:sponsorships:view", "finance:expenses:read", "finance:expense:read", "finance:read", "fundraising:sponsor:read"})
    public ResponseEntity<List<FinanceSponsorship>> getSponsorships() {
        return ResponseEntity.ok(financeService.getSponsorships());
    }

    @PostMapping("/sponsorships")
    @RequirePermission(code = "finance:sponsorships:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write", "fundraising:sponsor:write"})
    public ResponseEntity<FinanceSponsorship> createSponsorship(@RequestBody FinanceSponsorship sponsorship) {
        return ResponseEntity.ok(financeService.createSponsorship(sponsorship));
    }

    @PutMapping("/sponsorships/{id}")
    @RequirePermission(code = "finance:sponsorships:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write", "fundraising:sponsor:write"})
    public ResponseEntity<Void> updateSponsorship(@PathVariable UUID id, @RequestBody FinanceSponsorship sponsorship) {
        sponsorship.setId(id);
        financeService.updateSponsorship(sponsorship);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/sponsorships/{id}")
    @RequirePermission(code = "finance:sponsorships:delete", anyOf = {"finance:sponsorships:write", "finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<Void> deleteSponsorship(@PathVariable UUID id) {
        financeService.deleteSponsorship(id);
        return ResponseEntity.noContent().build();
    }

    // --- 5. OTHER INCOMES ---
    @GetMapping("/other-incomes")
    @RequirePermission(code = "finance:other_incomes:read", anyOf = {"finance:otherincomes:view", "finance:expenses:read", "finance:expense:read", "finance:read"})
    public ResponseEntity<List<FinanceOtherIncome>> getOtherIncomes() {
        return ResponseEntity.ok(financeService.getOtherIncomes());
    }

    @PostMapping("/other-incomes")
    @RequirePermission(code = "finance:other_incomes:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<FinanceOtherIncome> createOtherIncome(@RequestBody FinanceOtherIncome income) {
        return ResponseEntity.ok(financeService.createOtherIncome(income));
    }

    @PutMapping("/other-incomes/{id}")
    @RequirePermission(code = "finance:other_incomes:write", anyOf = {"finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<Void> updateOtherIncome(@PathVariable UUID id, @RequestBody FinanceOtherIncome income) {
        income.setId(id);
        financeService.updateOtherIncome(income);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/other-incomes/{id}")
    @RequirePermission(code = "finance:other_incomes:delete", anyOf = {"finance:other_incomes:write", "finance:expenses:write", "finance:expense:write", "finance:write"})
    public ResponseEntity<Void> deleteOtherIncome(@PathVariable UUID id) {
        financeService.deleteOtherIncome(id);
        return ResponseEntity.noContent().build();
    }

    // --- 6. STATISTICS ---
    @GetMapping("/stats")
    @RequirePermission(code = "finance:statistics:read", anyOf = {"finance:report:read", "finance:expense:read", "finance:expenses:read", "finance:statistics:view", "finance:read"})
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(financeService.getFinancialStats());
    }
}
