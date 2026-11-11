package com.charityapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
public class AppConfigProperties {

    private final Stripe stripe = new Stripe();
    private final Google google = new Google();
    private final Gmail gmail = new Gmail();
    private final Gemini gemini = new Gemini();
    private final App app = new App();
    private final Charity charity = new Charity();
    private final Whatsapp whatsapp = new Whatsapp();
    private final Resend resend = new Resend();

    public Stripe getStripe() { return stripe; }
    public Google getGoogle() { return google; }
    public Gmail getGmail() { return gmail; }
    public Gemini getGemini() { return gemini; }
    public App getApp() { return app; }
    public Charity getCharity() { return charity; }
    public Whatsapp getWhatsapp() { return whatsapp; }
    public Resend getResend() { return resend; }

    public static class Whatsapp {
        private boolean enabled = true;
        private boolean autoMessagesEnabled = true;
        private String serviceUrl = "http://localhost:3001";
        private String internalSecret = "app_internal_secret";
        private int rateLimitDelayMs = 1500;
        private final Group group = new Group();

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public boolean isAutoMessagesEnabled() { return autoMessagesEnabled; }
        public void setAutoMessagesEnabled(boolean autoMessagesEnabled) { this.autoMessagesEnabled = autoMessagesEnabled; }
        public String getServiceUrl() { return serviceUrl; }
        public void setServiceUrl(String serviceUrl) { this.serviceUrl = serviceUrl; }
        public String getInternalSecret() { return internalSecret; }
        public void setInternalSecret(String internalSecret) { this.internalSecret = internalSecret; }
        public int getRateLimitDelayMs() { return rateLimitDelayMs; }
        public void setRateLimitDelayMs(int rateLimitDelayMs) { this.rateLimitDelayMs = rateLimitDelayMs; }
        public Group getGroup() { return group; }

        public static class Group {
            private String admin;
            private String finance;
            private String logistics;
            private String hr;

            public String getAdmin() { return admin; }
            public void setAdmin(String admin) { this.admin = admin; }
            public String getFinance() { return finance; }
            public void setFinance(String finance) { this.finance = finance; }
            public String getLogistics() { return logistics; }
            public void setLogistics(String logistics) { this.logistics = logistics; }
            public String getHr() { return hr; }
            public void setHr(String hr) { this.hr = hr; }
        }
    }

    public static class Gemini {
        private String apiKey;
        private String model = "gemini-3.7-flash";
        private List<String> fallbackModels = List.of("gemini-3.6-flash");

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public List<String> getFallbackModels() { return fallbackModels; }
        public void setFallbackModels(List<String> fallbackModels) { this.fallbackModels = fallbackModels; }
    }

    public static class Stripe {
        private String secretKey;
        private String webhookSecret = "whsec_default";

        public String getSecretKey() { return secretKey; }
        public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
        public String getWebhookSecret() { return webhookSecret; }
        public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }
    }

    public static class Google {
        private String credentialsJson;
        private String refreshToken;
        private final Sheets sheets = new Sheets();
        private final Docs docs = new Docs();
        private final Drive drive = new Drive();

        public String getCredentialsJson() { return credentialsJson; }
        public void setCredentialsJson(String credentialsJson) { this.credentialsJson = credentialsJson; }
        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
        public Sheets getSheets() { return sheets; }
        public Docs getDocs() { return docs; }
        public Drive getDrive() { return drive; }

        public static class Sheets {
            private String credentialsJson;
            private String refreshToken;
            private String spreadsheetId;

            public String getCredentialsJson() { return credentialsJson; }
            public void setCredentialsJson(String credentialsJson) { this.credentialsJson = credentialsJson; }
            public String getRefreshToken() { return refreshToken; }
            public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
            public String getSpreadsheetId() { return spreadsheetId; }
            public void setSpreadsheetId(String spreadsheetId) { this.spreadsheetId = spreadsheetId; }
        }

        public static class Docs {
            private String credentialsJson;
            private String refreshToken;

            public String getCredentialsJson() { return credentialsJson; }
            public void setCredentialsJson(String credentialsJson) { this.credentialsJson = credentialsJson; }
            public String getRefreshToken() { return refreshToken; }
            public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
        }

        public static class Drive {
            private String credentialsJson;
            private String refreshToken;
            private String folderId;

            public String getCredentialsJson() { return credentialsJson; }
            public void setCredentialsJson(String credentialsJson) { this.credentialsJson = credentialsJson; }
            public String getRefreshToken() { return refreshToken; }
            public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
            public String getFolderId() { return folderId; }
            public void setFolderId(String folderId) { this.folderId = folderId; }
        }

        private String appsScriptUrl;
        private String appsScriptSecret = "app_legal_secret";

        public String getAppsScriptUrl() { return appsScriptUrl; }
        public void setAppsScriptUrl(String appsScriptUrl) { this.appsScriptUrl = appsScriptUrl; }
        public String getAppsScriptSecret() { return appsScriptSecret; }
        public void setAppsScriptSecret(String appsScriptSecret) { this.appsScriptSecret = appsScriptSecret; }
    }

    public static class Gmail {
        private String credentialsJson;
        private String refreshToken;

        public String getCredentialsJson() { return credentialsJson; }
        public void setCredentialsJson(String credentialsJson) { this.credentialsJson = credentialsJson; }
        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    }

    public static class App {
        private final PickupCode pickupCode = new PickupCode();
        private final DefaultConfig defaultConfig = new DefaultConfig();
        private final Frontend frontend = new Frontend();

        public PickupCode getPickupCode() { return pickupCode; }
        public DefaultConfig getDefaultConfig() { return defaultConfig; }
        public Frontend getFrontend() { return frontend; }

        public static class PickupCode {
            private double threshold = 30.0;
            public double getThreshold() { return threshold; }
            public void setThreshold(double threshold) { this.threshold = threshold; }
        }

        public static class DefaultConfig {
            private String currency = "ron";
            public String getCurrency() { return currency; }
            public void setCurrency(String currency) { this.currency = currency; }
        }

        public static class Frontend {
            private String successUrl = "https://example.org/donation-success";
            private String cancelUrl = "https://example.org/donation-cancelled";

            public String getSuccessUrl() { return successUrl; }
            public void setSuccessUrl(String successUrl) { this.successUrl = successUrl; }
            public String getCancelUrl() { return cancelUrl; }
            public void setCancelUrl(String cancelUrl) { this.cancelUrl = cancelUrl; }
        }
    }

    public static class Charity {
        private final Email email = new Email();
        public Email getEmail() { return email; }

        public static class Email {
            private String from = "contact@example.org";
            private final Subject subject = new Subject();

            public String getFrom() { return from; }
            public void setFrom(String from) { this.from = from; }
            public Subject getSubject() { return subject; }

            public static class Subject {
                private String pickupCode = "Codul personal de pickup";
                public String getPickupCode() { return pickupCode; }
                public void setPickupCode(String pickupCode) { this.pickupCode = pickupCode; }
            }
        }
    }

    public static class Resend {
        private String apiKey = "";
        private String fromEmail = "contact@example.org";
        private String fromName = "Causeway";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getFromEmail() { return fromEmail; }
        public void setFromEmail(String fromEmail) { this.fromEmail = fromEmail; }
        public String getFromName() { return fromName; }
        public void setFromName(String fromName) { this.fromName = fromName; }
    }
}
