package com.charityapp.service.logistics;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.TenantProperties;
import com.charityapp.repository.finance.DonationRepository;
import org.springframework.stereotype.Service;

@Service
public class PickupCodeService {

    private final DonationRepository donationRepository;
    private final TenantProperties tenantProperties;

    public PickupCodeService(DonationRepository donationRepository) {
        this(donationRepository, new TenantProperties());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PickupCodeService(DonationRepository donationRepository, TenantProperties tenantProperties) {
        this.donationRepository = donationRepository;
        this.tenantProperties = tenantProperties != null ? tenantProperties : new TenantProperties();
    }

    public String generatePickupCode() {
        long nextNumber = donationRepository.getNextPickupCodeSequenceValue();
        String prefix = tenantProperties != null && tenantProperties.getIntegrations() != null
                ? tenantProperties.getIntegrations().getPickupCodePrefix()
                : "APP-";
        return String.format("%s%04d", prefix, nextNumber);
    }
}