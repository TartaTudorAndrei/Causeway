package com.charityapp.service.finance;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.finance.Donation;
import com.charityapp.repository.finance.DonationRepository;
import com.charityapp.config.AppConfigProperties;
import com.charityapp.service.email_provider_service.EmailProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class DonationProcessingService {

    private static final Logger log = LoggerFactory.getLogger(DonationProcessingService.class);

    private final DonationRepository donationRepository;
    private final PickupCodeService pickupCodeService;
    private final EmailProvider emailProvider;
    private final GoogleSheetsService googleSheetsService;
    private final AppConfigProperties properties;

    public DonationProcessingService(DonationRepository donationRepository,
                                     PickupCodeService pickupCodeService,
                                     EmailProvider emailProvider,
                                     GoogleSheetsService googleSheetsService,
                                     AppConfigProperties properties) {
        this.donationRepository = donationRepository;
        this.pickupCodeService = pickupCodeService;
        this.emailProvider = emailProvider;
        this.googleSheetsService = googleSheetsService;
        this.properties = properties;
    }

    private static final java.util.regex.Pattern EMAIL_PATTERN = java.util.regex.Pattern.compile(
        "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$"
    );

    @Transactional
    public void processSuccessfulDonation(String paymentTransactionId,
                                          String paymentProvider,
                                          String donorEmail,
                                          double amount,
                                          String itemsDescription) {
        if (donationRepository.findByPaymentTransactionId(paymentTransactionId).isPresent()) {
            log.info("Donation transaction {} already recorded. Skipping duplicate processing.", paymentTransactionId);
            return;
        }

        // Generate pickup code if threshold met
        String pickupCode = null;
        if (amount >= properties.getApp().getPickupCode().getThreshold()) {
            pickupCode = pickupCodeService.generatePickupCode();
        }

        // Save donation atomically with duplicate suppression
        Donation donation = new Donation();
        donation.setPaymentTransactionId(paymentTransactionId);
        donation.setPaymentProvider(paymentProvider);
        donation.setDonorEmail(donorEmail);
        donation.setAmount(BigDecimal.valueOf(amount));
        donation.setCurrency(properties.getApp().getDefaultConfig().getCurrency());
        donation.setPickupCode(pickupCode);
        donation.setStatus("completed");
        donation.setCreatedAt(LocalDateTime.now());

        java.util.Optional<Donation> saved = donationRepository.saveIfAbsent(donation);
        if (saved.isEmpty()) {
            log.info("Duplicate donation insert ignored for tx: {}", paymentTransactionId);
            return;
        }

        Donation persistedDonation = saved.get();

        // Trigger external APIs (Sheets, Email) only after transaction commits successfully.
        // This avoids holding DB connections open during third-party HTTP round-trips.
        String finalPickupCode = pickupCode;
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    triggerExternalServices(persistedDonation, finalPickupCode, amount);
                }
            });
        } else {
            triggerExternalServices(persistedDonation, finalPickupCode, amount);
        }

        log.info("Processed donation: {} via {} with pickup code: {}", paymentTransactionId, paymentProvider, pickupCode);
    }

    private void triggerExternalServices(Donation donation, String pickupCode, double amount) {
        // Sync to Google Sheets in isolated try-catch so it never prevents pickup email delivery
        try {
            googleSheetsService.syncDonationToSheet(donation);
            log.info("Google Sheets sync completed for donation: {}", donation.getId());
        } catch (Exception e) {
            log.error("Google Sheets sync failed for donation: {}", donation.getId(), e);
        }

        // Send pickup code email if applicable
        if (pickupCode != null && isValidEmail(donation.getDonorEmail())) {
            try {
                emailProvider.sendPickupCodeEmail(donation.getDonorEmail(), pickupCode, amount);
                log.info("Pickup code email sent to {}", maskEmail(donation.getDonorEmail()));
            } catch (Exception e) {
                log.error("Error sending pickup code email to {}", maskEmail(donation.getDonorEmail()), e);
            }
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        String name = email.substring(0, at);
        String domain = email.substring(at);
        if (name.length() <= 2) {
            return name.charAt(0) + "***" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }

    public boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email.trim()).matches();
    }
}
