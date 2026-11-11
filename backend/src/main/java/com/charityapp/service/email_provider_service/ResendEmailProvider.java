package com.charityapp.service.email_provider_service;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.service.notification.ResendEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service("resendEmailProvider")
@Primary
public class ResendEmailProvider implements EmailProvider {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailProvider.class);

    private final ResendEmailService resendEmailService;
    private final GmailEmailProvider fallbackGmailEmailProvider;
    private final SpringTemplateEngine templateEngine;
    private final AppConfigProperties properties;

    public ResendEmailProvider(ResendEmailService resendEmailService,
                               GmailEmailProvider fallbackGmailEmailProvider,
                               SpringTemplateEngine templateEngine,
                               AppConfigProperties properties) {
        this.resendEmailService = resendEmailService;
        this.fallbackGmailEmailProvider = fallbackGmailEmailProvider;
        this.templateEngine = templateEngine;
        this.properties = properties;
    }

    @Override
    public void sendPickupCodeEmail(String to, String pickupCode, double amount) throws Exception {
        if (resendEmailService != null && resendEmailService.isConfigured()) {
            double pickupCodeThreshold = properties.getApp().getPickupCode().getThreshold();

            Context context = new Context();
            context.setVariable("amount", amount);
            context.setVariable("pickupCode", pickupCode);

            int mugCount = (int) Math.floor(amount / pickupCodeThreshold);
            boolean plural = mugCount > 1;

            context.setVariable("mugCount", mugCount);
            context.setVariable("plural", plural);

            String htmlContent = templateEngine.process("email/pickup-code", context);
            String emailSubject = properties.getCharity().getEmail().getSubject().getPickupCode();

            boolean sent = resendEmailService.sendEmail(to, emailSubject, htmlContent);
            if (sent) {
                log.info("Pickup code email sent via Resend to {}", to);
                return;
            }
            log.warn("Resend pickup email dispatch returned false, falling back to Gmail email provider...");
        }

        fallbackGmailEmailProvider.sendPickupCodeEmail(to, pickupCode, amount);
    }
}
