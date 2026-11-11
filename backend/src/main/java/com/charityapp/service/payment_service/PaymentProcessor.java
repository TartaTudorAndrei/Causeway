package com.charityapp.service.payment_service;

import com.charityapp.dto.finance.DonationCheckoutRequest;
import com.charityapp.dto.finance.PaymentCheckoutResult;

public interface PaymentProcessor {
    PaymentCheckoutResult createCheckoutSession(DonationCheckoutRequest request) throws Exception;
}
