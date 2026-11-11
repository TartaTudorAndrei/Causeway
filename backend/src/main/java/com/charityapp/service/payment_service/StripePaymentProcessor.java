package com.charityapp.service.payment_service;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.dto.finance.DonationCheckoutRequest;
import com.charityapp.dto.finance.PaymentCheckoutResult;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

@Service("stripePaymentProcessor")
public class StripePaymentProcessor implements PaymentProcessor {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentProcessor.class);

    private final AppConfigProperties properties;
    private final com.charityapp.config.TenantProperties tenantProperties;

    public StripePaymentProcessor(AppConfigProperties properties) {
        this(properties, new com.charityapp.config.TenantProperties());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public StripePaymentProcessor(AppConfigProperties properties, com.charityapp.config.TenantProperties tenantProperties) {
        this.properties = properties;
        this.tenantProperties = tenantProperties != null ? tenantProperties : new com.charityapp.config.TenantProperties();
    }

    @Override
    public PaymentCheckoutResult createCheckoutSession(DonationCheckoutRequest request) throws StripeException {
        String defaultCurrency = properties.getApp().getDefaultConfig().getCurrency();
        String defaultSuccessUrl = properties.getApp().getFrontend().getSuccessUrl();
        String defaultCancelUrl = properties.getApp().getFrontend().getCancelUrl();

        String currency = resolveCurrency(request.getCurrency(), defaultCurrency);
        long amountInMinorUnits = convertToMinorUnits(request.getAmount());

        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(resolveUrl(request.getSuccessUrl(), defaultSuccessUrl) + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(resolveUrl(request.getCancelUrl(), defaultCancelUrl))
                .setCustomerEmail(request.getDonorEmail())
                .setAllowPromotionCodes(true);

        String stripeProductName = (tenantProperties != null && tenantProperties.getIntegrations() != null && tenantProperties.getIntegrations().getStripeProductName() != null)
                ? tenantProperties.getIntegrations().getStripeProductName() : "Charity Donation";
        String defaultDescription = (tenantProperties != null && tenantProperties.getIntegrations() != null && tenantProperties.getIntegrations().getStripeDescription() != null)
                ? tenantProperties.getIntegrations().getStripeDescription() : "Charity donation";

        SessionCreateParams.LineItem.PriceData.ProductData productData =
                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName(stripeProductName)
                        .setDescription(StringUtils.hasText(request.getItemsDescription())
                                ? request.getItemsDescription()
                                : defaultDescription)
                        .build();

        SessionCreateParams.LineItem.PriceData priceData =
                SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(currency)
                        .setUnitAmount(amountInMinorUnits)
                        .setProductData(productData)
                        .build();

        SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(priceData)
                .build();

        paramsBuilder.addLineItem(lineItem);

        Map<String, String> metadata = new HashMap<>();
        metadata.put("donor_email", request.getDonorEmail());

        if (StringUtils.hasText(request.getDonorName())) {
            metadata.put("donor_name", request.getDonorName());
        }
        if (StringUtils.hasText(request.getItemsDescription())) {
            metadata.put("items_description", request.getItemsDescription());
        }
        metadata.put("donation_amount_minor", String.valueOf(amountInMinorUnits));
        metadata.put("donation_currency", currency);

        SessionCreateParams.PaymentIntentData paymentIntentData =
                SessionCreateParams.PaymentIntentData.builder()
                        .putAllMetadata(metadata)
                        .setReceiptEmail(request.getDonorEmail())
                        .build();

        paramsBuilder.setPaymentIntentData(paymentIntentData);

        log.info("Creating Stripe checkout session for {}", request.getDonorEmail());
        Session session = Session.create(paramsBuilder.build());
        return new PaymentCheckoutResult(session.getId(), session.getUrl());
    }

    private String resolveCurrency(String requestedCurrency, String defaultCurrency) {
        if (StringUtils.hasText(requestedCurrency)) {
            return requestedCurrency.toLowerCase();
        }
        return defaultCurrency.toLowerCase();
    }

    private long convertToMinorUnits(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    private String resolveUrl(String candidate, String fallback) {
        return StringUtils.hasText(candidate) ? candidate : fallback;
    }
}
