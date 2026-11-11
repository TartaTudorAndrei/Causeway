package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import com.charityapp.config.GmailConfig;
import com.charityapp.config.AppConfigProperties;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;

@Service
public class AdminEmailService {
    private static final Logger log = LoggerFactory.getLogger(AdminEmailService.class);
    private final Gmail gmail;
    private final GmailConfig gmailConfig;
    private final AppConfigProperties properties;
    private final ResendEmailService resendEmailService;

    @Autowired
    public AdminEmailService(Gmail gmail, GmailConfig gmailConfig, AppConfigProperties properties, ResendEmailService resendEmailService) {
        this.gmail = gmail;
        this.gmailConfig = gmailConfig;
        this.properties = properties;
        this.resendEmailService = resendEmailService;
    }

    public AdminEmailService(Gmail gmail, GmailConfig gmailConfig, AppConfigProperties properties) {
        this(gmail, gmailConfig, properties, null);
    }

    public void sendEmail(String to, String subject, String htmlContent) {
        CompletableFuture.runAsync(() -> {
            String maskedRecipient = maskEmail(to);
            try {
                if (resendEmailService != null && resendEmailService.isConfigured()) {
                    boolean sent = resendEmailService.sendEmail(to, subject, htmlContent);
                    if (sent) {
                        return;
                    }
                    log.warn("Resend email dispatch returned false, falling back to Gmail / Mock...");
                }

                if (gmailConfig.isMockMode()) {
                    log.info("📧 [MOCK EMAIL SERVICE] Recipient: {} | Subject: {} | Content length: {} chars", 
                             maskedRecipient, subject, htmlContent != null ? htmlContent.length() : 0);
                    return;
                }
                MimeMessage email = createMimeMessage(to, subject, htmlContent);
                Message gmailMessage = createGmailMessage(email);
                gmail.users().messages().send("me", gmailMessage).execute();
                log.info("Email sent successfully to: {}", maskedRecipient);
            } catch (com.google.api.client.googleapis.json.GoogleJsonResponseException ge) {
                String errorDetails = ge.getDetails() != null ? ge.getDetails().getMessage() : ge.getMessage();
                log.error("Gmail send failed for recipient [{}], subject [{}]: {} (details: {})", 
                          maskedRecipient, subject, ge.getMessage(), errorDetails);
                log.warn("📧 [EMAIL FALLBACK] Email delivery failed for recipient [{}] with subject [{}]", maskedRecipient, subject);
            } catch (Exception e) {
                log.error("Gmail send failed for recipient [{}], subject [{}]: {}", maskedRecipient, subject, e.getMessage());
                log.warn("📧 [EMAIL FALLBACK] Email delivery failed for recipient [{}] with subject [{}]", maskedRecipient, subject);
            }
        });
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

    private MimeMessage createMimeMessage(String to, String subject, String htmlContent) throws Exception {
        String fromEmail = properties.getCharity().getEmail().getFrom();
        Properties props = new Properties();
        props.put("mail.mime.charset", "UTF-8");
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage email = new MimeMessage(session);
        email.setFrom(new InternetAddress(fromEmail));
        email.addRecipient(jakarta.mail.Message.RecipientType.TO, new InternetAddress(to));
        email.setSubject(subject, "UTF-8");
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
