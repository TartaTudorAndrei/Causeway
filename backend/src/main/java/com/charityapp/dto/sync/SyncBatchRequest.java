package com.charityapp.dto.sync;

import java.util.List;

public class SyncBatchRequest {
    private List<OfflineMutationDto> mutations;

    public SyncBatchRequest() {
    }

    public SyncBatchRequest(List<OfflineMutationDto> mutations) {
        this.mutations = mutations;
    }

    public List<OfflineMutationDto> getMutations() {
        return mutations;
    }

    public void setMutations(List<OfflineMutationDto> mutations) {
        this.mutations = mutations;
    }
}
