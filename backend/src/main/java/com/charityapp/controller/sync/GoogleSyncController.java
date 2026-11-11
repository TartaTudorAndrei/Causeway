package com.charityapp.controller.sync;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.sync.GoogleSyncStatusDTO;
import com.charityapp.service.google.GoogleDashboardSyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/sync/google-sheets")
public class GoogleSyncController {

    private final GoogleDashboardSyncService syncService;

    public GoogleSyncController(GoogleDashboardSyncService syncService) {
        this.syncService = syncService;
    }

    @GetMapping("/status")
    @RequirePermission(code = "general:read")
    public ResponseEntity<GoogleSyncStatusDTO> getSyncStatus() {
        return ResponseEntity.ok(syncService.getStatus());
    }

    @PostMapping("/trigger")
    @RequirePermission(code = "it:sync:manage")
    public ResponseEntity<GoogleSyncStatusDTO> triggerSync() {
        GoogleSyncStatusDTO result = syncService.syncAllDashboardData();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/spreadsheet-id")
    @RequirePermission(code = "it:sync:manage")
    public ResponseEntity<GoogleSyncStatusDTO> updateSpreadsheetId(@RequestBody Map<String, String> body) {
        String spreadsheetId = body != null ? body.get("spreadsheetId") : null;
        syncService.setCustomSpreadsheetId(spreadsheetId);
        return ResponseEntity.ok(syncService.getStatus());
    }

    @PostMapping("/folder-id")
    @RequirePermission(code = "it:sync:manage")
    public ResponseEntity<GoogleSyncStatusDTO> updateFolderId(@RequestBody Map<String, String> body) {
        String folderId = body != null ? body.get("folderId") : null;
        syncService.setCustomFolderId(folderId);
        return ResponseEntity.ok(syncService.getStatus());
    }
}
