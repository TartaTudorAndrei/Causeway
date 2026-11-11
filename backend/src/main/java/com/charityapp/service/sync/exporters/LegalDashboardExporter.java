package com.charityapp.service.sync.exporters;

import com.charityapp.model.legal.GeneratedContract;
import com.charityapp.repository.legal.LegalRepository;
import com.charityapp.service.sync.DashboardExportable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class LegalDashboardExporter implements DashboardExportable {

    private final LegalRepository legalRepository;

    public LegalDashboardExporter(LegalRepository legalRepository) {
        this.legalRepository = legalRepository;
    }

    @Override
    public String getTabName() { return "Legal_Contracts"; }

    @Override
    public String getDomain() { return "LEGAL"; }

    @Override
    public List<String> getHeaders() {
        return List.of("Contract Number", "Title", "Party A", "Party B", "Party B Email", "Status", "Valid From", "Valid Until", "Created By", "Drive Doc Link", "Notes");
    }

    @Override
    public List<List<Object>> getRows() {
        List<GeneratedContract> contracts = legalRepository.findAllContracts();
        List<List<Object>> contractRows = new ArrayList<>();
        for (GeneratedContract c : contracts) {
            String docLink = c.getDriveFileId() != null ? "https://docs.google.com/document/d/" + c.getDriveFileId() + "/edit" : "";
            contractRows.add(List.of(
                    c.getContractNumber() != null ? c.getContractNumber() : "",
                    c.getTitle() != null ? c.getTitle() : "",
                    c.getPartyAName() != null ? c.getPartyAName() : "",
                    c.getPartyBName() != null ? c.getPartyBName() : "",
                    c.getPartyBEmail() != null ? c.getPartyBEmail() : "",
                    c.getStatus() != null ? c.getStatus() : "draft",
                    c.getValidFrom() != null ? c.getValidFrom().toString() : "",
                    c.getValidUntil() != null ? c.getValidUntil().toString() : "",
                    c.getCreatedBy() != null ? c.getCreatedBy() : "",
                    docLink,
                    c.getNotes() != null ? c.getNotes() : ""
            ));
        }
        return contractRows;
    }
}
