package com.charityapp.service.email_provider_service;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import com.charityapp.config.GmailConfig;
import com.charityapp.config.AppConfigProperties;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Properties;

@Service("gmailEmailProvider")
public class GmailEmailProvider implements EmailProvider {

    private final Gmail gmail;
    private final GmailConfig gmailConfig;
    private final SpringTemplateEngine templateEngine;
    private final AppConfigProperties properties;

    public GmailEmailProvider(Gmail gmail,
                              GmailConfig gmailConfig,
                              SpringTemplateEngine templateEngine,
                              AppConfigProperties properties) {
        this.gmail = gmail;
        this.gmailConfig = gmailConfig;
        this.templateEngine = templateEngine;
        this.properties = properties;
    }

    @Override
    public void sendPickupCodeEmail(String to, String pickupCode, double amount) throws Exception {
        if (gmailConfig.isMockMode()) {
            return;
        }
        double pickupCodeThreshold = properties.getApp().getPickupCode().getThreshold();

        Context context = new Context();
        context.setVariable("amount", amount);
        context.setVariable("pickupCode", pickupCode);

        int mugCount = (int) Math.floor(amount / pickupCodeThreshold);
        boolean plural = mugCount > 1;

        context.setVariable("mugCount", mugCount);
        context.setVariable("plural", plural);

        String htmlContent = templateEngine.process("email/pickup-code", context);

        MimeMessage email = createMimeMessage(to, htmlContent);

        Message gmailMessage = createGmailMessage(email);

        gmail.users().messages().send("me", gmailMessage).execute();
    }

    private MimeMessage createMimeMessage(String to, String htmlContent) throws Exception {
        String fromEmail = properties.getCharity().getEmail().getFrom();
        String emailSubject = properties.getCharity().getEmail().getSubject().getPickupCode();

        Properties props = new Properties();
        props.put("mail.mime.charset", "UTF-8");

        Session session = Session.getDefaultInstance(props, null);

        MimeMessage email = new MimeMessage(session);
        email.setFrom(new InternetAddress(fromEmail));
        email.addRecipient(jakarta.mail.Message.RecipientType.TO, new InternetAddress(to));

        email.setSubject(emailSubject, "UTF-8");

        email.setContent(htmlContent, "text/html; charset=UTF-8");

        return email;
    }

    private Message createGmailMessage(MimeMessage mimeMessage) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        mimeMessage.writeTo(buffer);

        String encodedEmail = Base64.getUrlEncoder().encodeToString(buffer.toByteArray());

        Message message = new Message();
        message.setRaw(encodedEmail);
        return message;
    }
}
