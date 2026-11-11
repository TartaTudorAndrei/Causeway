package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.TenantProperties;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
public class EmailTemplateService {

    private final TemplateEngine templateEngine;
    private final TenantProperties tenantProperties;

    public EmailTemplateService(TemplateEngine templateEngine, TenantProperties tenantProperties) {
        this.templateEngine = templateEngine;
        this.tenantProperties = tenantProperties;
    }

    public String createPickupCodeEmailTemplate(String pickupCode, double amount, String contactEmail) {
        Context context = new Context();
        context.setVariable("pickupCode", pickupCode);
        context.setVariable("amount", amount);
        context.setVariable("currentYear", java.time.Year.now().getValue());
        context.setVariable("contactEmail", (contactEmail != null && !contactEmail.isBlank())
                ? contactEmail
                : (tenantProperties != null && tenantProperties.getIntegrations() != null ? tenantProperties.getIntegrations().getContactEmail() : ""));
        context.setVariable("orgName", (tenantProperties != null && tenantProperties.getIdentity() != null)
                ? tenantProperties.getIdentity().getName() : "Causeway");
        context.setVariable("orgShorthand", (tenantProperties != null && tenantProperties.getIdentity() != null)
                ? tenantProperties.getIdentity().getShorthand() : "CHARITY");
        context.setVariable("city", (tenantProperties != null && tenantProperties.getLocation() != null)
                ? tenantProperties.getLocation().getCity() : "");
        context.setVariable("merchItem", (tenantProperties != null && tenantProperties.getTerminology() != null)
                ? tenantProperties.getTerminology().getMerchandiseItemSingular() : "Articol");
        context.setVariable("logoUrl", (tenantProperties != null && tenantProperties.getTheme() != null && tenantProperties.getTheme().getAssets() != null) ? tenantProperties.getTheme().getAssets().getLogoLightUrl() : null);
        context.setVariable("merchItems", (tenantProperties != null && tenantProperties.getTerminology() != null)
                ? tenantProperties.getTerminology().getMerchandiseItemPlural() : "Articole");

        return templateEngine.process("email/pickup-code", context);
    }
}