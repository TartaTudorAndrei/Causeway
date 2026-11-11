package com.charityapp.service.finance;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.model.finance.Donation;
import com.charityapp.repository.finance.DonationRepository;
import com.charityapp.service.email_provider_service.EmailProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DonationProcessingServiceTest {

    private DonationRepository donationRepository;
    private PickupCodeService pickupCodeService;
    private EmailProvider emailProvider;
    private GoogleSheetsService googleSheetsService;
    private AppConfigProperties properties;
    private DonationProcessingService service;

    @BeforeEach
    void setUp() {
        donationRepository = mock(DonationRepository.class);
        pickupCodeService = mock(PickupCodeService.class);
        emailProvider = mock(EmailProvider.class);
        googleSheetsService = mock(GoogleSheetsService.class);
        properties = new AppConfigProperties();
        properties.getApp().getPickupCode().setThreshold(30.0);
        properties.getApp().getDefaultConfig().setCurrency("RON");

        service = new DonationProcessingService(
                donationRepository,
                pickupCodeService,
                emailProvider,
                googleSheetsService,
                properties
        );
    }

    @Test
    void testDuplicateDonationTransactionIsIgnored() throws Exception {
        String txId = "pi_12345";
        Donation existing = new Donation();
        existing.setPaymentTransactionId(txId);
        when(donationRepository.findByPaymentTransactionId(txId)).thenReturn(Optional.of(existing));

        service.processSuccessfulDonation(txId, "STRIPE", "donor@test.org", 50.0, "Items");

        verify(donationRepository, never()).saveIfAbsent(any());
        verify(emailProvider, never()).sendPickupCodeEmail(any(), any(), anyDouble());
    }

    @Test
    void testGoogleSheetsFailureDoesNotBlockEmailDispatch() throws Exception {
        String txId = "pi_99999";
        when(donationRepository.findByPaymentTransactionId(txId)).thenReturn(Optional.empty());
        when(pickupCodeService.generatePickupCode()).thenReturn("PICKUP-123");

        Donation savedDonation = new Donation();
        savedDonation.setId(100L);
        savedDonation.setPaymentTransactionId(txId);
        savedDonation.setDonorEmail("donor@test.org");
        when(donationRepository.saveIfAbsent(any())).thenReturn(Optional.of(savedDonation));

        // Sheets throws exception
        doThrow(new RuntimeException("Google Sheets API timeout")).when(googleSheetsService).syncDonationToSheet(any());

        assertDoesNotThrow(() ->
            service.processSuccessfulDonation(txId, "STRIPE", "donor@test.org", 50.0, "Items")
        );

        // Verify email was still sent despite sheets failure
        verify(emailProvider, times(1)).sendPickupCodeEmail(eq("donor@test.org"), eq("PICKUP-123"), eq(50.0));
    }

    @Test
    void testEmailValidation() {
        assertTrue(service.isValidEmail("test@example.com"));
        assertTrue(service.isValidEmail("user.name+tag@sub.domain.org"));
        assertFalse(service.isValidEmail("invalid-email"));
        assertFalse(service.isValidEmail("@nodomain"));
        assertFalse(service.isValidEmail("nouser@"));
        assertFalse(service.isValidEmail(null));
        assertFalse(service.isValidEmail(""));
    }
}
