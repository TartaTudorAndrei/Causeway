package com.charityapp.dto.legal;

public class LegalStatsDTO {
    private long totalTemplates;
    private long totalContracts;
    private long draftContracts;
    private long pendingContracts;
    private long signedContracts;
    private long archivedContracts;

    public LegalStatsDTO() {}

    public LegalStatsDTO(long totalTemplates, long totalContracts, long draftContracts,
                         long pendingContracts, long signedContracts, long archivedContracts) {
        this.totalTemplates = totalTemplates;
        this.totalContracts = totalContracts;
        this.draftContracts = draftContracts;
        this.pendingContracts = pendingContracts;
        this.signedContracts = signedContracts;
        this.archivedContracts = archivedContracts;
    }

    public long getTotalTemplates() { return totalTemplates; }
    public void setTotalTemplates(long totalTemplates) { this.totalTemplates = totalTemplates; }

    public long getTotalContracts() { return totalContracts; }
    public void setTotalContracts(long totalContracts) { this.totalContracts = totalContracts; }

    public long getDraftContracts() { return draftContracts; }
    public void setDraftContracts(long draftContracts) { this.draftContracts = draftContracts; }

    public long getPendingContracts() { return pendingContracts; }
    public void setPendingContracts(long pendingContracts) { this.pendingContracts = pendingContracts; }

    public long getSignedContracts() { return signedContracts; }
    public void setSignedContracts(long signedContracts) { this.signedContracts = signedContracts; }

    public long getArchivedContracts() { return archivedContracts; }
    public void setArchivedContracts(long archivedContracts) { this.archivedContracts = archivedContracts; }
}
