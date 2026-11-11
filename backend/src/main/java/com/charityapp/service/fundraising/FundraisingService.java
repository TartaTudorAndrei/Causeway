package com.charityapp.service.fundraising;

import com.charityapp.event.DashboardDataChangedEvent;
import com.charityapp.model.fundraising.FundraisingSponsor;
import com.charityapp.repository.fundraising.FundraisingRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class FundraisingService {

    private final FundraisingRepository fundraisingRepository;
    private final ApplicationEventPublisher eventPublisher;

    public FundraisingService(FundraisingRepository fundraisingRepository, ApplicationEventPublisher eventPublisher) {
        this.fundraisingRepository = fundraisingRepository;
        this.eventPublisher = eventPublisher;
    }

    public List<FundraisingSponsor> getAllSponsors() {
        return fundraisingRepository.findAll();
    }

    public FundraisingSponsor getSponsorById(UUID id) {
        return fundraisingRepository.findById(id).orElse(null);
    }

    public FundraisingSponsor createSponsor(FundraisingSponsor sponsor) {
        if (sponsor.getId() == null) {
            sponsor.setId(UUID.randomUUID());
        }
        FundraisingSponsor saved = fundraisingRepository.save(sponsor);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Fundraising", "createSponsor"));
        return saved;
    }

    public FundraisingSponsor updateSponsor(UUID id, FundraisingSponsor updated) {
        updated.setId(id);
        fundraisingRepository.update(updated);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Fundraising", "updateSponsor"));
        return updated;
    }

    public void deleteSponsor(UUID id) {
        fundraisingRepository.delete(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Fundraising", "deleteSponsor"));
    }
}
