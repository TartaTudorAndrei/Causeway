package com.charityapp.controller.test;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.service.finance.DonationProcessingService;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/test")
@Profile({"dev", "test"})
public class TestWebhookController {

    private final DonationProcessingService donationProcessingService;

    public TestWebhookController(DonationProcessingService donationProcessingService) {
        this.donationProcessingService = donationProcessingService;
    }

    // POST version (for API tools)
    @PostMapping("/simulate-donation")
    public String simulateDonationPost(
            @RequestParam String email,
            @RequestParam double amount,
            @RequestParam(required = false) String name) {
        return processTestDonation(email, amount, name);
    }

    // GET version (for browser testing)
    @GetMapping("/simulate-donation")
    public String simulateDonationGet(
            @RequestParam String email,
            @RequestParam double amount,
            @RequestParam(required = false) String name) {
        return processTestDonation(email, amount, name);
    }

    private String processTestDonation(String email, double amount, String name) {
        if (name == null) {
            name = "Test Donor";
        }

        String mockStripeId = "pi_test_" + System.currentTimeMillis();
        String itemsDescription = "Test donation items";

        donationProcessingService.processSuccessfulDonation(
                mockStripeId, "TEST", email, amount, itemsDescription
        );

        return "Test donation processed! Check your console/terminal for pickup code and email details.";
    }
}