package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.service.email_provider_service.GmailEmailProvider;
import com.charityapp.service.email_provider_service.ResendEmailProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.thymeleaf.context.IContext;
import org.thymeleaf.spring6.SpringTemplateEngine;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ResendEmailProviderTest {

    private ResendEmailService resendEmailService;
    private GmailEmailProvider fallbackGmailProvider;
    private SpringTemplateEngine templateEngine;
    private AppConfigProperties properties;
    private ResendEmailProvider provider;

    @BeforeEach
    void setUp() {
        resendEmailService = mock(ResendEmailService.class);
        fallbackGmailProvider = mock(GmailEmailProvider.class);
        templateEngine = mock(SpringTemplateEngine.class);
        properties = new AppConfigProperties();
        properties.getCharity().getEmail().getSubject().setPickupCode("Your Pickup Code");
        properties.getApp().getPickupCode().setThreshold(30.0);

        provider = new ResendEmailProvider(
                resendEmailService,
                fallbackGmailProvider,
                templateEngine,
                properties
        );
    }

    @Test
    void testSendsViaResendWhenConfigured() throws Exception {
        when(resendEmailService.isConfigured()).thenReturn(true);
        when(templateEngine.process(eq("email/pickup-code"), any(IContext.class))).thenReturn("<html>Pickup Content</html>");
        when(resendEmailService.sendEmail(any(), any(), any())).thenReturn(true);

        provider.sendPickupCodeEmail("donor@example.org", "PICK-1234", 60.0);

        verify(resendEmailService).sendEmail("donor@example.org", "Your Pickup Code", "<html>Pickup Content</html>");
        verify(fallbackGmailProvider, never()).sendPickupCodeEmail(any(), any(), anyDouble());
    }

    @Test
    void testFallsBackToGmailWhenResendNotConfigured() throws Exception {
        when(resendEmailService.isConfigured()).thenReturn(false);

        provider.sendPickupCodeEmail("donor@example.org", "PICK-1234", 60.0);

        verify(fallbackGmailProvider).sendPickupCodeEmail("donor@example.org", "PICK-1234", 60.0);
        verify(resendEmailService, never()).sendEmail(any(), any(), any());
    }
}
