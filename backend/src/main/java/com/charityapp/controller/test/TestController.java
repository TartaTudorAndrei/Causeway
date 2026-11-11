package com.charityapp.controller.test;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.*;
import com.charityapp.model.admin.*;
import com.charityapp.model.finance.*;
import com.charityapp.model.notification.*;
import com.charityapp.service.email_provider_service.EmailProvider;
import com.charityapp.service.finance.DonationProcessingService;
import com.charityapp.service.google.GoogleSheetsService;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@Profile({"dev", "test"})
public class TestController {

    private final JdbcTemplate jdbcTemplate;
    private final EmailProvider emailService;
    private final DonationProcessingService donationProcessingService;
    private final GoogleSheetsService googleSheetsService;

    public TestController(JdbcTemplate jdbcTemplate,
                          EmailProvider emailService,
                          DonationProcessingService donationProcessingService,
                          GoogleSheetsService googleSheetsService) {
        this.jdbcTemplate = jdbcTemplate;
        this.emailService = emailService;
        this.donationProcessingService = donationProcessingService;
        this.googleSheetsService = googleSheetsService;
    }

    // ========== SAFE READ-ONLY ENDPOINTS ==========

    @GetMapping("/test-db")
    public String testDatabase() {
        try {
            String version = jdbcTemplate.queryForObject("SELECT version()", String.class);
            return "PostgreSQL Connection Successful! Version: " + version;
        } catch (Exception e) {
            return "Database connection failed: " + e.getMessage();
        }
    }

    @GetMapping("/test-table")
    public String testTable() {
        try {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM donations.donations", Integer.class);
            return "Donations table accessible! Current record count: " + count;
        } catch (Exception e) {
            return "Table access failed: " + e.getMessage() + ". The table might not exist yet.";
        }
    }

    @GetMapping("/list-tables")
    public String listTables() {
        try {
            String sql = """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                """;
            List<Map<String, Object>> tables = jdbcTemplate.queryForList(sql);
            return "Available tables: " + tables.toString();
        } catch (Exception e) {
            return "Failed to list tables: " + e.getMessage();
        }
    }

    @GetMapping("/debug-sheets")
    public String debugSheets() {
        try {
            StringBuilder debugInfo = new StringBuilder();
            debugInfo.append("=== GOOGLE SHEETS DEBUG ===<br>");

            // Check if credentials are set
            String credentialsJson = System.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON");
            String spreadsheetId = System.getenv("GOOGLE_SHEETS_SPREADSHEET_ID");

            debugInfo.append("Credentials set: ").append(credentialsJson != null && !credentialsJson.isEmpty()).append("<br>");
            debugInfo.append("Spreadsheet ID set: ").append(spreadsheetId != null && !spreadsheetId.isEmpty()).append("<br>");

            if (credentialsJson != null) {
                try {
                    com.google.gson.JsonParser.parseString(credentialsJson);
                    debugInfo.append("Credentials JSON is valid: true<br>");
                } catch (Exception e) {
                    debugInfo.append("Credentials JSON is valid: false - ").append(e.getMessage()).append("<br>");
                }
            }

            try {
                googleSheetsService.syncDonationToSheet(null);
                debugInfo.append("Sheets service initialized: true<br>");
            } catch (Exception e) {
                debugInfo.append("Sheets service error: ").append(e.getMessage()).append("<br>");
            }

            return debugInfo.toString();
        } catch (Exception e) {
            return "❌ Debug failed: " + e.getMessage();
        }
    }

    @GetMapping("/debug-webhook")
    public String debugWebhook() {
        StringBuilder debug = new StringBuilder();
        debug.append("=== WEBHOOK DEBUG ===<br>");

        try {
            String testPaymentId = "debug_pi_" + System.currentTimeMillis();
            donationProcessingService.processSuccessfulDonation(testPaymentId, "TEST", "test@example.org", 50.0, "Debug items");
            debug.append("✅ Donation processing works<br>");
        } catch (Exception e) {
            debug.append("❌ Donation processing failed: ").append(e.getMessage()).append("<br>");
        }

        try {
            emailService.sendPickupCodeEmail("test@example.org", "DEBUG-CODE", 50.0);
            debug.append("✅ Email service works<br>");
        } catch (Exception e) {
            debug.append("❌ Email service failed: ").append(e.getMessage()).append("<br>");
        }

        try {
            Donation testDonation = new Donation();
            testDonation.setPaymentTransactionId("test_sheets_debug");
            testDonation.setPaymentProvider("TEST");
            testDonation.setDonorEmail("test@example.com");
            testDonation.setAmount(new java.math.BigDecimal("25.00"));
            testDonation.setCurrency("RON");
            testDonation.setStatus("completed");
            testDonation.setCreatedAt(java.time.LocalDateTime.now());

            googleSheetsService.syncDonationToSheet(testDonation);
            debug.append("✅ Google Sheets works<br>");
        } catch (Exception e) {
            debug.append("❌ Google Sheets failed: ").append(e.getMessage()).append("<br>");
        }

        return debug.toString();
    }

    @PostMapping("/debug-webhook-raw")
    public String debugWebhookRaw(@RequestBody String rawPayload,
                                  @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        System.out.println("=== RAW WEBHOOK DEBUG ===");
        System.out.println("Raw payload: " + rawPayload);
        System.out.println("Signature header: " + sigHeader);

        try {
            com.google.gson.JsonObject json = com.google.gson.JsonParser.parseString(rawPayload).getAsJsonObject();
            System.out.println("Event type: " + json.get("type").getAsString());
            System.out.println("Data object: " + json.get("data").getAsJsonObject());
            return "✅ Raw webhook data logged - check application logs";
        } catch (Exception e) {
            System.err.println("❌ Failed to parse webhook JSON: " + e.getMessage());
            return "❌ Failed to parse webhook data";
        }
    }

    @RestController
    @RequestMapping("/email")
    @Profile({"dev", "test"})
    public static class EmailController {

        private final EmailProvider emailService;
        private final com.charityapp.service.notification.AdminEmailService adminEmailService;

        public EmailController(EmailProvider emailService,
                               com.charityapp.service.notification.AdminEmailService adminEmailService) {
            this.emailService = emailService;
            this.adminEmailService = adminEmailService;
        }

        @PostMapping("/pickup")
        public String sendPickup(@RequestParam String to,
                                 @RequestParam String pickupCode,
                                 @RequestParam int amount) {
            try {
                emailService.sendPickupCodeEmail(to, pickupCode, amount);
                return "✅ Email sent successfully to " + to;
            } catch (Exception e) {
                e.printStackTrace();
                return "❌ Error sending email: " + e.getMessage();
            }
        }

        @GetMapping("/test")
        public String testSendPickup(@RequestParam String to,
                                     @RequestParam(defaultValue = "APP-TEST-100") String pickupCode,
                                     @RequestParam(defaultValue = "50") int amount) {
            try {
                emailService.sendPickupCodeEmail(to, pickupCode, amount);
                return "✅ Test pickup email sent successfully to " + to;
            } catch (Exception e) {
                e.printStackTrace();
                return "❌ Error sending test email: " + e.getMessage();
            }
        }

        @GetMapping("/test-admin-verify")
        public String testAdminVerify(@RequestParam String to, jakarta.servlet.http.HttpServletRequest request) {
            try {
                String origin = request.getHeader("Origin");
                if (origin == null || origin.isBlank()) {
                    origin = request.getHeader("Referer");
                }
                String baseUrl = (origin != null && !origin.isBlank()) ? origin.replaceAll("/+$", "") : "https://example.org";
                String link = baseUrl + "/login?verifyToken=test-token";
                adminEmailService.sendEmail(to, "Test Verificare Admin", 
                    "<div style='font-family: Arial, sans-serif; padding: 20px; background: #18181b; color: #fff; border-radius: 8px;'>"
                    + "<h3>Test link verificare</h3><p><a href='" + link + "' style='color: #60a5fa;'>Click confirmare</a></p></div>"
                );
                return "✅ Test admin verify email triggered to: " + to + " (link: " + link + ")";
            } catch (Exception e) {
                e.printStackTrace();
                return "❌ Error: " + e.getMessage();
            }
        }
    }

    // ========== DANGEROUS ENDPOINTS - COMMENTED OUT ==========

    /*
    @GetMapping("/create-table")
    public String createTable() {
        try {
            String sql = """
                CREATE TABLE IF NOT EXISTS donations (
                    id BIGSERIAL PRIMARY KEY,
                    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
                    donor_email VARCHAR(255) NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'RON',
                    pickup_code VARCHAR(20) UNIQUE,
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """;
            jdbcTemplate.execute(sql);
            return "Donations table created successfully!";
        } catch (Exception e) {
            return "Table creation failed: " + e.getMessage();
        }
    }

    @GetMapping("/clear-table")
    public String clearTable() {
        try {
            jdbcTemplate.execute("DELETE FROM donations");
            jdbcTemplate.execute("ALTER SEQUENCE donations_id_seq RESTART WITH 1");
            return "✅ Donations table cleared and ID sequence reset!";
        } catch (Exception e) {
            return "❌ Failed to clear table: " + e.getMessage();
        }
    }

    @PostMapping("/test-email")
    public String testEmail(@RequestParam String email) {
        try {
            emailService.sendPickupCodeEmail(email, "Test Donor", "APP-9999", 50.0);
            return "✅ Test email sent to: " + email;
        } catch (Exception e) {
            return "❌ Failed to send test email: " + e.getMessage();
        }
    }

    @PostMapping("/test-simple-email")
    public String testSimpleEmail(@RequestParam String email) {
        try {
            emailService.sendSimplePickupCodeEmail(email, "Test Donor", "APP-8888", 40.0);
            return "✅ Simple test email sent to: " + email;
        } catch (Exception e) {
            return "❌ Failed to send simple test email: " + e.getMessage();
        }
    }

    @GetMapping("/test-email-get")
    public String testEmailGet(@RequestParam String email) {
        try {
            emailService.sendPickupCodeEmail(email, "Test Donor", "APP-7777", 60.0);
            return "✅ Test email sent to: " + email;
        } catch (Exception e) {
            return "❌ Failed to send test email: " + e.getMessage();
        }
    }

    @GetMapping("/test-simple-email-get")
    public String testSimpleEmailGet(@RequestParam String email) {
        try {
            emailService.sendSimplePickupCodeEmail(email, "Test Donor", "APP-8888", 40.0);
            return "✅ Simple test email sent to: " + email;
        } catch (Exception e) {
            return "❌ Failed to send simple test email: " + e.getMessage();
        }
    }

    @PostMapping("/test-donation")
    public String testDonation(@RequestParam String email,
                               @RequestParam double amount) {
        try {
            String testPaymentIntentId = "test_pi_" + System.currentTimeMillis();
            donationProcessingService.processSuccessfulDonation(testPaymentIntentId, email, amount, "Test items");
            return "✅ Test donation processed successfully for: " + email;
        } catch (Exception e) {
            return "❌ Test donation failed: " + e.getMessage();
        }
    }

    @GetMapping("/test-donation-get")
    public String testDonationGet(@RequestParam String email,
                                  @RequestParam double amount) {
        try {
            String testPaymentIntentId = "test_pi_" + System.currentTimeMillis();
            donationProcessingService.processSuccessfulDonation(testPaymentIntentId, email, amount, "Test items");
            return "✅ Test donation processed successfully for: " + email;
        } catch (Exception e) {
            return "❌ Test donation failed: " + e.getMessage();
        }
    }

    @GetMapping("/test-email-debug")
    public String testEmailDebug(@RequestParam String email) {
        try {
            System.out.println("=== EMAIL DEBUG START ===");
            System.out.println("Sending to: " + email);

            // Test Gmail Service
            System.out.println("Testing Gmail service...");
            emailService.sendPickupCodeEmail(email, "APP-GMAIL-999", 50.0);
            System.out.println("Gmail test completed");

            System.out.println("=== EMAIL DEBUG END ===");

            return "✅ Debug email attempted. Check logs for details.";
        } catch (Exception e) {
            System.err.println("❌ Debug email failed: " + e.getMessage());
            e.printStackTrace();
            return "❌ Debug email failed: " + e.getMessage();
        }
    }
    */
}