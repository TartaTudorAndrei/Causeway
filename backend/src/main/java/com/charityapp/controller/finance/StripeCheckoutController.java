package com.charityapp.controller.finance;

import com.charityapp.dto.finance.DonationCheckoutRequest;
import com.charityapp.dto.finance.PaymentCheckoutResult;
import com.charityapp.dto.finance.StripeCheckoutResponse;
import com.charityapp.service.payment_service.PaymentProcessor;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stripe")
public class StripeCheckoutController {

    private static final Logger log = LoggerFactory.getLogger(StripeCheckoutController.class);

    private final PaymentProcessor paymentProcessor;

    public StripeCheckoutController(@Qualifier("stripePaymentProcessor") PaymentProcessor paymentProcessor) {
        this.paymentProcessor = paymentProcessor;
    }

    @PostMapping("/checkout-session")
    public ResponseEntity<?> createCheckoutSession(
            @Valid @RequestBody DonationCheckoutRequest request,
            BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(bindingResult.getAllErrors());
        }

        try {
            PaymentCheckoutResult result = paymentProcessor.createCheckoutSession(request);
            StripeCheckoutResponse response = new StripeCheckoutResponse(result.getSessionId(), result.getUrl());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error while creating checkout session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "A apărut o eroare la inițierea plății securizate. Vă rugăm să reîncercați."));
        }
    }
}

