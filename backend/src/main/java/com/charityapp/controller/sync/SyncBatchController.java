package com.charityapp.controller.sync;

import com.charityapp.dto.sync.SyncBatchRequest;
import com.charityapp.dto.sync.SyncBatchResponse;
import com.charityapp.service.sync.SyncBatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/sync", "/api/admin/sync"})
public class SyncBatchController {

    private final SyncBatchService syncBatchService;

    public SyncBatchController(SyncBatchService syncBatchService) {
        this.syncBatchService = syncBatchService;
    }

    @PostMapping("/batch")
    public ResponseEntity<SyncBatchResponse> processBatch(@RequestBody SyncBatchRequest request) {
        SyncBatchResponse response = syncBatchService.processBatch(request);
        return ResponseEntity.ok(response);
    }
}
