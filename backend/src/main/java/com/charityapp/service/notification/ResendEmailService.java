package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResendEmailService {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.resend.api-key:${RESEND_API_KEY:}}")
    private String apiKey;

    @Value("${app.resend.from-email:${RESEND_FROM_EMAIL:contact@example.org}}")
    private String fromEmail = "contact@example.org";

    @Value("${app.resend.from-name:${RESEND_FROM_NAME:Causeway}}")
    private String fromName = "Causeway";

    public ResendEmailService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.startsWith("re_placeholder");
    }

    public boolean sendEmail(String to, String subject, String htmlContent) {
        if (!isConfigured()) {
            log.info("📧 [MOCK EMAIL SERVICE / RESEND] Resend API key not configured. Mocking email delivery to: {}", maskEmail(to));
            return false;
        }

        String maskedRecipient = maskEmail(to);
        try {
            String fromHeader = (fromName != null && !fromName.isBlank())
                    ? String.format("%s <%s>", fromName.trim(), fromEmail.trim())
                    : fromEmail.trim();

            Map<String, Object> payload = new HashMap<>();
            payload.put("from", fromHeader);
            payload.put("to", List.of(to.trim()));
            payload.put("subject", subject != null ? subject : "");
            payload.put("html", htmlContent != null ? htmlContent : "");

            String requestBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Email sent successfully via Resend to: {} (HTTP {})", maskedRecipient, response.statusCode());
                return true;
            } else {
                log.error("Resend API rejected email for [{}] with HTTP {}: {}", maskedRecipient, response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to send email via Resend to [{}]: {}", maskedRecipient, e.getMessage(), e);
            return false;
        }
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

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public void setFromEmail(String fromEmail) {
        this.fromEmail = fromEmail;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }
}
