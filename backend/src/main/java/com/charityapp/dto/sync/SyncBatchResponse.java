package com.charityapp.dto.sync;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class SyncBatchResponse {
    private List<String> processed = new ArrayList<>();
    private List<Map<String, Object>> conflicts = new ArrayList<>();

    public SyncBatchResponse() {
    }

    public SyncBatchResponse(List<String> processed, List<Map<String, Object>> conflicts) {
        this.processed = processed != null ? processed : new ArrayList<>();
        this.conflicts = conflicts != null ? conflicts : new ArrayList<>();
    }

    public List<String> getProcessed() {
        return processed;
    }

    public void setProcessed(List<String> processed) {
        this.processed = processed;
    }

    public List<Map<String, Object>> getConflicts() {
        return conflicts;
    }

    public void setConflicts(List<Map<String, Object>> conflicts) {
        this.conflicts = conflicts;
    }
}
