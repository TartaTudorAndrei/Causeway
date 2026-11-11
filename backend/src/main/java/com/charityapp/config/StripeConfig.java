package com.charityapp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;

@Configuration
public class StripeConfig {

    private static final Logger log = LoggerFactory.getLogger(StripeConfig.class);

    private final AppConfigProperties properties;

    public StripeConfig(AppConfigProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void init() {
        String secretKey = properties.getStripe().getSecretKey();
        Stripe.apiKey = secretKey;
        if (secretKey != null && secretKey.length() > 8) {
            log.info("Stripe configured with API key prefix: {}****", secretKey.substring(0, 4));
        } else {
            log.warn("Stripe secret key appears to be missing or too short");
        }
    }
}