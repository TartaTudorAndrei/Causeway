package com.charityapp.webhook;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.repository.finance.DonationRepository;
import com.charityapp.service.finance.DonationProcessingService;
import com.charityapp.config.AppConfigProperties;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhook/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final DonationProcessingService donationProcessingService;
    private final DonationRepository donationRepository;
    private final AppConfigProperties properties;

    public StripeWebhookController(DonationProcessingService donationProcessingService,
                                   DonationRepository donationRepository,
                                   AppConfigProperties properties) {
        this.donationProcessingService = donationProcessingService;
        this.donationRepository = donationRepository;
        this.properties = properties;
    }

    @PostMapping
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        log.info("=== STRIPE WEBHOOK RECEIVED ===");

        if (sigHeader == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("No signature header");
        }

        try {
            Event event = Webhook.constructEvent(payload, sigHeader, properties.getStripe().getWebhookSecret());
            log.info("Webhook type: {}", event.getType());

            switch (event.getType()) {
                case "checkout.session.completed":
                    handleCheckoutSessionCompleted(event);
                    break;
                case "payment_intent.succeeded":
                    handlePaymentSuccess(event);
                    break;
                case "payment_intent.payment_failed":
                    handlePaymentFailure(event);
                    break;
                default:
                    log.info("Unhandled event type: {}", event.getType());
            }

            return ResponseEntity.ok("Webhook processed successfully");

        } catch (SignatureVerificationException e) {
            log.error("Invalid webhook signature: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Webhook processing failed");
        }
    }

    private void handlePaymentSuccess(Event event) {
        log.info("Processing payment_intent.succeeded");
        try {
            log.info("Event ID: {}", event.getId());

            PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer().getObject().orElse(null);

            if (paymentIntent != null) {
                log.info("Got PaymentIntent via standard deserialization: {}", paymentIntent.getId());
                processPaymentIntent(paymentIntent);
                return;
            }

            log.info("Standard deserialization failed, trying raw JSON...");

            String rawJson = event.getDataObjectDeserializer().getRawJson();
            log.info("Raw JSON length: {}", (rawJson != null ? rawJson.length() : "null"));

            if (rawJson != null) {
                try {
                    paymentIntent = PaymentIntent.GSON.fromJson(rawJson, PaymentIntent.class);

                    if (paymentIntent != null) {
                        log.info("Successfully parsed PaymentIntent from raw JSON: {}", paymentIntent.getId());
                        log.info("Donor email: {}", paymentIntent.getReceiptEmail());
                        log.info("Amount: {}", paymentIntent.getAmount());
                        processPaymentIntent(paymentIntent);
                        return;
                    }
                } catch (Exception e) {
                    log.error("GSON parsing failed", e);
                }
            }

            log.error("All PaymentIntent extraction methods failed");

        } catch (Exception e) {
            log.error("Error processing payment success", e);
        }
    }

    private void processPaymentIntent(PaymentIntent paymentIntent) {
        log.info("Processing PaymentIntent: {}", paymentIntent.getId());

        String paymentIntentId = paymentIntent.getId();
        if (paymentIntentId == null) {
            log.error("PaymentIntent ID is null");
            return;
        }

        // Check if already processed
        if (donationRepository.findByPaymentTransactionId(paymentIntentId).isPresent()) {
            log.info("PaymentIntent already processed: {}", paymentIntentId);
            return;
        }

        String donorEmail = resolveDonorEmail(paymentIntent);
        double amount = paymentIntent.getAmount() / 100.0;
        String itemsDescription = paymentIntent.getMetadata().get("items_description");

        log.info("Processing Stripe donation: tx={}, donor={}, amount={} RON", paymentIntentId, maskEmail(donorEmail), amount);
        log.debug("Metadata: {}", paymentIntent.getMetadata());

        if (donorEmail == null || donorEmail.equals("unknown@charity.org")) {
            log.error("Could not resolve donor email for payment: {}", paymentIntentId);
            return;
        }

        try {
            donationProcessingService.processSuccessfulDonation(
                    paymentIntentId,
                    "STRIPE",
                    donorEmail,
                    amount,
                    itemsDescription != null ? itemsDescription : "Stripe donation"
            );
            log.info("Successfully processed donation: {}", paymentIntentId);
        } catch (Exception e) {
            log.error("Error in donation processing", e);
        }
    }

    private void handlePaymentFailure(Event event) {
        log.error("Payment failed: {}", event.getId());
    }

    private void handleCheckoutSessionCompleted(Event event) throws StripeException {
        log.info("Processing checkout.session.completed");
        Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);

        if (session == null) {
            log.error("Session is null");
            return;
        }

        log.info("Session ID: {}, Amount: {}", session.getId(), session.getAmountTotal());
        log.debug("Session Customer Email: {}", (session.getCustomerDetails() != null ? maskEmail(session.getCustomerDetails().getEmail()) : "null"));

        String paymentIntentId = session.getPaymentIntent();
        if (paymentIntentId == null) {
            log.error("No PaymentIntent in session");
            return;
        }

        log.info("Retrieving PaymentIntent: {}", paymentIntentId);
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        processPaymentIntent(paymentIntent);
    }

    private String resolveDonorEmail(PaymentIntent paymentIntent) {
        String fromReceipt = paymentIntent.getReceiptEmail();
        if (fromReceipt != null && !fromReceipt.isEmpty()) {
            return fromReceipt;
        }

        String metadataEmail = paymentIntent.getMetadata().get("donor_email");
        if (metadataEmail != null && !metadataEmail.isEmpty()) {
            return metadataEmail;
        }

        // Try customer email from payment intent
        if (paymentIntent.getCustomer() != null) {
            try {
                String customerEmail = paymentIntent.getCustomerObject().getEmail();
                if (customerEmail != null && !customerEmail.isEmpty()) {
                    return customerEmail;
                }
            } catch (Exception e) {
                log.error("Error getting customer email", e);
            }
        }

        log.error("Could not resolve donor email, using fallback");
        return "unknown@charity.org";
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
}