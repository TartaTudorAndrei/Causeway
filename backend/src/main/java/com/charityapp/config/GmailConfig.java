package com.charityapp.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.StringReader;

@Configuration
@SuppressWarnings("deprecation")
public class GmailConfig {

    private static final Logger log = LoggerFactory.getLogger(GmailConfig.class);
    private static final String APPLICATION_NAME = "Charity Email Sender";
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private boolean mockMode = false;

    private final GoogleCredentialFactory credentialFactory;

    public GmailConfig(GoogleCredentialFactory credentialFactory) {
        this.credentialFactory = credentialFactory;
    }

    public boolean isMockMode() {
        return mockMode;
    }

    @Bean
    public GoogleCredential gmailCredential() throws Exception {
        String credentialsJson = credentialFactory.resolveCredentialsJson("gmail");
        String refreshToken = credentialFactory.resolveRefreshToken("gmail");

        if (credentialsJson == null || credentialsJson.trim().isEmpty() || refreshToken == null || refreshToken.trim().isEmpty()) {
            this.mockMode = true;
            log.warn("Gmail API credentials or refresh token not configured. Email features running in mock mode.");
            GoogleClientSecrets mockSecrets = new GoogleClientSecrets();
            GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
            details.setClientId("mock-client-id");
            details.setClientSecret("mock-client-secret");
            mockSecrets.setInstalled(details);

            return new GoogleCredential.Builder()
                    .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                    .setJsonFactory(JSON_FACTORY)
                    .setClientSecrets(mockSecrets)
                    .build();
        }

        this.mockMode = false;

        GoogleClientSecrets clientSecrets = credentialFactory.loadClientSecrets(credentialsJson);

        return new GoogleCredential.Builder()
                .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientSecrets)
                .build()
                .setRefreshToken(refreshToken);
    }

    @Bean
    public Gmail gmailService(GoogleCredential credential) throws Exception {
        try {
            if (credential.getRefreshToken() != null) {
                credential.refreshToken();
            }
        } catch (Exception e) {
            log.warn("Gmail token refresh skipped: {}", e.getMessage());
        }

        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        return new Gmail.Builder(
                httpTransport,
                JSON_FACTORY,
                credential
        )
                .setApplicationName(APPLICATION_NAME)
                .build();
    }
}
