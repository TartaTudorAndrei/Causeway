package com.charityapp.service.google;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.charityapp.config.AppConfigProperties;
import com.charityapp.model.finance.Donation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@SuppressWarnings("deprecation")
public class GoogleSheetsService {

    private static final Logger log = LoggerFactory.getLogger(GoogleSheetsService.class);

    private final AppConfigProperties properties;
    private final com.charityapp.config.GoogleCredentialFactory credentialFactory;

    private static final String RANGE = "Sheet1!A:H";
    private static final List<String> SCOPES = Collections.singletonList(SheetsScopes.SPREADSHEETS);

    public GoogleSheetsService(AppConfigProperties properties, com.charityapp.config.GoogleCredentialFactory credentialFactory) {
        this.properties = properties;
        this.credentialFactory = credentialFactory;
    }

    private Sheets getSheetsService() throws Exception {
        GoogleCredential credential = credentialFactory.createCredential(SCOPES, "sheets");

        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("Charity Donations")
                .build();
    }

    public void syncDonationToSheet(Donation donation) {
        String spreadsheetId = properties != null && properties.getGoogle() != null && properties.getGoogle().getSheets() != null
                ? properties.getGoogle().getSheets().getSpreadsheetId() : null;
        if (spreadsheetId == null || spreadsheetId.isBlank()) {
            spreadsheetId = System.getenv("GOOGLE_SHEETS_SPREADSHEET_ID");
        }
        if (spreadsheetId == null || spreadsheetId.isBlank()) {
            log.warn("Google Sheets spreadsheet ID not configured");
            return;
        }

        try {
            Sheets service = getSheetsService();

            List<Object> row = Arrays.asList(
                    donation.getId(),
                    donation.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                    donation.getDonorEmail(),
                    donation.getAmount().doubleValue(),
                    donation.getCurrency(),
                    donation.getPickupCode() != null ? donation.getPickupCode() : "N/A",
                    donation.getStatus(),
                    donation.getPaymentTransactionId()
            );

            ValueRange body = new ValueRange().setValues(Collections.singletonList(row));

            service.spreadsheets().values()
                    .append(spreadsheetId, RANGE, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();

            log.info("Successfully synced donation to Google Sheets: {}", donation.getId());

        } catch (Exception e) {
            log.error("Failed to sync donation to Google Sheets", e);
        }
    }
}