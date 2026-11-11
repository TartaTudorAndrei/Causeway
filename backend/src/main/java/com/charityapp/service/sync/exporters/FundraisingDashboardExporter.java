package com.charityapp.service.sync.exporters;

import com.charityapp.model.fundraising.FundraisingSponsor;
import com.charityapp.repository.fundraising.FundraisingRepository;
import com.charityapp.service.sync.DashboardExportable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class FundraisingDashboardExporter implements DashboardExportable {

    private final FundraisingRepository fundraisingRepository;

    public FundraisingDashboardExporter(FundraisingRepository fundraisingRepository) {
        this.fundraisingRepository = fundraisingRepository;
    }

    @Override
    public String getTabName() { return "Fundraising_Sponsors"; }

    @Override
    public String getDomain() { return "FUNDRAISING"; }

    @Override
    public List<String> getHeaders() {
        return List.of("Company Name", "Profile", "Contact Person", "Contact Info", "Status", "Sponsorship Type", "Received Type", "Received Value", "Currency", "Last Contact Date", "Notes");
    }

    @Override
    public List<List<Object>> getRows() {
        List<FundraisingSponsor> fundraisingSponsors = fundraisingRepository.findAll();
        List<List<Object>> frRows = new ArrayList<>();
        for (FundraisingSponsor fs : fundraisingSponsors) {
            frRows.add(List.of(
                    fs.getCompanyName() != null ? fs.getCompanyName() : "",
                    fs.getCompanyProfile() != null ? fs.getCompanyProfile() : "",
                    fs.getResponsiblePerson() != null ? fs.getResponsiblePerson() : "",
                    fs.getContactInfo() != null ? fs.getContactInfo() : "",
                    fs.getStatus() != null ? fs.getStatus() : "",
                    fs.getSponsorshipType() != null ? fs.getSponsorshipType() : "",
                    fs.getReceivedType() != null ? fs.getReceivedType() : "",
                    fs.getReceivedValue() != null ? fs.getReceivedValue() : "",
                    fs.getCurrency() != null ? fs.getCurrency() : "RON",
                    fs.getLastContactDate() != null ? fs.getLastContactDate().toString() : "",
                    fs.getNotes() != null ? fs.getNotes() : ""
            ));
        }
        return frRows;
    }
}
