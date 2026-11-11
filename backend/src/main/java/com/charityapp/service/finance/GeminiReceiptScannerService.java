package com.charityapp.service.finance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.charityapp.config.AppConfigProperties;
import com.charityapp.dto.finance.ScannedExpenseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GeminiReceiptScannerService {
    private static final Logger log = LoggerFactory.getLogger(GeminiReceiptScannerService.class);

    private final String apiKey;
    private final String primaryModel;
    private final List<String> candidateModels;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private static final Set<String> SUPPORTED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
            "application/pdf"
    );

    public GeminiReceiptScannerService(
            @Value("${app.gemini.api-key:}") String propertyApiKey,
            @Value("${app.gemini.model:}") String propertyModel,
            @Value("${app.gemini.fallback-models:}") String propertyFallbackModels,
            AppConfigProperties appProperties,
            ObjectMapper objectMapper) {
        String key = propertyApiKey;
        if ((key == null || key.isBlank()) && appProperties.getGemini() != null) {
            key = appProperties.getGemini().getApiKey();
        }
        this.apiKey = key != null ? key.trim() : "";

        String configuredModel = propertyModel;
        if ((configuredModel == null || configuredModel.isBlank()) && appProperties.getGemini() != null) {
            configuredModel = appProperties.getGemini().getModel();
        }
        this.primaryModel = (configuredModel != null && !configuredModel.isBlank()) ? configuredModel.trim() : "gemini-3.7-flash";

        List<String> fallbacks = new ArrayList<>();
        if (propertyFallbackModels != null && !propertyFallbackModels.isBlank()) {
            for (String m : propertyFallbackModels.split(",")) {
                if (!m.isBlank()) {
                    fallbacks.add(m.trim());
                }
            }
        } else if (appProperties.getGemini() != null && appProperties.getGemini().getFallbackModels() != null) {
            fallbacks.addAll(appProperties.getGemini().getFallbackModels());
        } else {
            fallbacks.addAll(List.of("gemini-3.6-flash"));
        }

        Set<String> orderedUniqueModels = new LinkedHashSet<>();
        orderedUniqueModels.add(this.primaryModel);
        orderedUniqueModels.addAll(fallbacks);
        this.candidateModels = new ArrayList<>(orderedUniqueModels);

        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public ScannedExpenseDto scanReceipt(byte[] fileBytes, String contentType, String originalFilename) {
        return scanReceipt(fileBytes, contentType, originalFilename, Collections.emptyList());
    }

    public ScannedExpenseDto scanReceipt(byte[] fileBytes, String contentType, String originalFilename, List<String> existingCategories) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("Google Gemini API Key is not configured. Please set GEMINI_API_KEY environment variable.");
        }

        if (fileBytes == null || fileBytes.length == 0) {
            throw new IllegalArgumentException("File content is empty.");
        }

        String normalizedMime = normalizeMimeType(contentType, originalFilename);
        if (!SUPPORTED_MIME_TYPES.contains(normalizedMime)) {
            throw new IllegalArgumentException("Unsupported file type: " + normalizedMime + ". Supported: JPG, PNG, WEBP, HEIC, PDF.");
        }

        String base64Data = Base64.getEncoder().encodeToString(fileBytes);

        String categoriesSection;
        if (existingCategories != null && !existingCategories.isEmpty()) {
            StringBuilder sb = new StringBuilder("Existing defined categories:\n");
            for (String cat : existingCategories) {
                sb.append("- ").append(cat).append("\n");
            }
            categoriesSection = sb.toString();
        } else {
            categoriesSection = "No predefined categories exist yet.\n";
        }

        String promptText = """
            You are an expert financial auditor OCR parser. Analyze this receipt / fiscal invoice / payment slip document (often in Romanian or English).
            Extract the key expense transaction fields with 100% precision:
            
            1. Total final amount paid (look for 'TOTAL', 'TOTAL LEI', 'TOTAL PLATA', 'REST DE PLATA', 'TOTAL GENERAL', or final invoice amount including VAT / TVA).
            2. Currency: standard 3-letter code (usually 'RON', 'EUR', or 'USD'). Default to 'RON' for Romanian receipts.
            3. Transaction Date: ISO date 'YYYY-MM-DD'. If day and month are ambiguous in Romanian context, remember dates are DD.MM.YYYY. Default to today if date is missing.
            4. Payment Method: one of 'Card', 'Cash', 'Bank Transfer', or 'Reimbursement'. Look for POS / CARD / NUMERAR / CASH / OP / VIRAMENT lines.
            5. Merchant / Vendor name (e.g. 'Dedeman', 'Kaufland', 'Lidl', 'eMAG', 'Bolt', 'CFR', etc.).
            
            6. Expense Name ('name'):
               - A crisp, concise title (max 50-60 characters) summarizing vendor and main purpose for fast lookups (e.g., 'Kaufland - Apă & Gustări Protocol', 'Dedeman - Șuruburi & Vopsea Stand', 'OMV - Carburant Transport').
            
            7. Items Breakdown & Quantities ('description'):
               - Extract all itemized line items with their exact quantities, packaging/volume, and prices whenever visible.
               - Standard template format per line item: '[Item Name / Specs] x [Quantity]' or '[Item Name] [Size/Volume] x [Quantity] ([Total or Unit Price] [Currency])'.
               - Example output in description:
                 'Apă plată 5L x 6 (36.00 RON), Cafea boabe 1kg x 2 (80.00 RON), Zahăr plic x 1 (12.00 RON)'
                 or
                 'Bandă adezivă 50m x 3, Diluant 1L x 1, Pensule set x 2'
               - If only a single item or general service: '[Item/Service Name] x 1'.
               - Use Romanian naming for common products (apă, cafea, pahare, combustibil, etc.).
            
            8. Category Determination ('category'):
            __CATEGORIES_SECTION__
               - INSTRUCTION: First check if the purchase accurately fits one of the existing defined categories above.
               - If an existing category is an accurate match, return that exact category string.
               - If NONE of the existing categories match properly, DO NOT force-pick an incorrect category or generic 'Altele'. Instead, generate and return a brand new concise, professional category name (in Romanian, 1-3 words, Title Case, e.g. 'Unelte & Reparații', 'Servicii Cloud & IT', 'Materiale Lemnoase').
            
            Return strictly a JSON object adhering to the specified schema.
            """.replace("__CATEGORIES_SECTION__", categoriesSection);

        String jsonPayload;
        try {
            Map<String, Object> requestBody = createGeminiRequestBody(promptText, normalizedMime, base64Data);
            jsonPayload = objectMapper.writeValueAsString(requestBody);
        } catch (Exception e) {
            log.error("Failed to build Gemini request payload: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to prepare receipt scan payload: " + e.getMessage(), e);
        }

        List<String> failureReasons = new ArrayList<>();

        for (String targetModel : candidateModels) {
            try {
                String geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent?key=" + apiKey;

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(geminiEndpoint))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(30))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    if (!targetModel.equals(primaryModel)) {
                        log.info("Gemini receipt scanned successfully using fallback model: {}", targetModel);
                    }
                    return parseGeminiResponse(response.body());
                }

                String errorDetail = "Model " + targetModel + " returned HTTP " + response.statusCode() + ": " + response.body();
                log.warn("Gemini model {} failed (HTTP {}). Checking next fallback in chain...", targetModel, response.statusCode());
                failureReasons.add(errorDetail);

                try {
                    Thread.sleep(300);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            } catch (Exception e) {
                log.warn("Exception during Gemini scan with model {}: {}", targetModel, e.getMessage());
                failureReasons.add("Model " + targetModel + " exception: " + e.getMessage());
            }
        }

        log.error("All Gemini models in fallback chain failed: {}", failureReasons);
        throw new RuntimeException("Nu s-au putut extrage automat datele din document. Te rugăm să reîncerci sau să completezi detaliile manual.");
    }

    private Map<String, Object> createGeminiRequestBody(String promptText, String mimeType, String base64Data) {
        Map<String, Object> textPart = Map.of("text", promptText);
        Map<String, Object> inlineData = Map.of(
                "mime_type", mimeType,
                "data", base64Data
        );
        Map<String, Object> filePart = Map.of("inline_data", inlineData);

        Map<String, Object> contentObj = Map.of(
                "parts", List.of(textPart, filePart)
        );

        Map<String, Object> schemaProperties = new LinkedHashMap<>();
        schemaProperties.put("name", Map.of("type", "STRING", "description", "Brief, crisp title (max 60 chars) summarizing vendor and purchase for fast lookup."));
        schemaProperties.put("amount", Map.of("type", "NUMBER", "description", "Total final expense amount as a decimal number."));
        schemaProperties.put("currency", Map.of("type", "STRING", "description", "3-letter currency code (e.g. RON, EUR, USD)."));
        schemaProperties.put("transactionDate", Map.of("type", "STRING", "description", "Transaction date in YYYY-MM-DD format."));
        schemaProperties.put("category", Map.of("type", "STRING", "description", "Best matching category from existing list, or newly created category name if none match."));
        schemaProperties.put("description", Map.of("type", "STRING", "description", "Itemized breakdown with quantities using the format: [Item Name] x [Quantity]."));
        schemaProperties.put("paymentMethod", Map.of("type", "STRING", "description", "Payment method: Card, Cash, Bank Transfer, or Reimbursement."));
        schemaProperties.put("merchantName", Map.of("type", "STRING", "description", "Name of the merchant or store."));

        Map<String, Object> responseSchema = Map.of(
                "type", "OBJECT",
                "properties", schemaProperties,
                "required", List.of("name", "amount", "currency", "transactionDate", "category", "description", "paymentMethod")
        );

        Map<String, Object> generationConfig = Map.of(
                "response_mime_type", "application/json",
                "response_schema", responseSchema,
                "temperature", 0.1
        );

        return Map.of(
                "contents", List.of(contentObj),
                "generationConfig", generationConfig
        );
    }

    private ScannedExpenseDto parseGeminiResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");
        if (candidates.isEmpty()) {
            throw new RuntimeException("No response generated by Gemini model.");
        }

        JsonNode contentParts = candidates.get(0).path("content").path("parts");
        if (contentParts.isEmpty()) {
            throw new RuntimeException("Empty content part from Gemini model.");
        }

        String rawJson = contentParts.get(0).path("text").asText();
        log.debug("Gemini receipt raw extraction: {}", rawJson);

        JsonNode parsed = objectMapper.readTree(rawJson);

        BigDecimal amount = BigDecimal.ZERO;
        if (parsed.has("amount") && !parsed.get("amount").isNull()) {
            amount = BigDecimal.valueOf(parsed.get("amount").asDouble());
        }

        String currency = parsed.has("currency") ? parsed.get("currency").asText("RON") : "RON";
        if (currency.isBlank()) currency = "RON";

        LocalDate transactionDate = LocalDate.now();
        if (parsed.has("transactionDate") && !parsed.get("transactionDate").asText().isBlank()) {
            try {
                transactionDate = LocalDate.parse(parsed.get("transactionDate").asText().trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (Exception e) {
                log.warn("Could not parse transaction date '{}', defaulting to today", parsed.get("transactionDate").asText());
            }
        }

        String name = parsed.has("name") ? parsed.get("name").asText("") : "";
        String category = parsed.has("category") ? parsed.get("category").asText("Altele") : "Altele";
        String description = parsed.has("description") ? parsed.get("description").asText("") : "";
        String paymentMethod = parsed.has("paymentMethod") ? parsed.get("paymentMethod").asText("Bank Transfer") : "Bank Transfer";
        String merchantName = parsed.has("merchantName") ? parsed.get("merchantName").asText("") : "";

        if (name.isBlank()) {
            if (!merchantName.isBlank()) {
                name = merchantName + (description.isBlank() ? "" : " - " + (description.length() > 35 ? description.substring(0, 32) + "..." : description));
            } else if (!description.isBlank()) {
                name = description.length() > 40 ? description.substring(0, 37) + "..." : description;
            } else {
                name = "Cheltuială " + category;
            }
        }

        return new ScannedExpenseDto(
                name,
                transactionDate,
                amount,
                currency.toUpperCase(),
                category,
                description,
                paymentMethod,
                merchantName,
                rawJson
        );
    }

    private String normalizeMimeType(String contentType, String filename) {
        if (contentType != null && !contentType.isBlank() && !"application/octet-stream".equalsIgnoreCase(contentType)) {
            return contentType.toLowerCase();
        }
        if (filename != null) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".heic")) return "image/heic";
            if (lower.endsWith(".heif")) return "image/heif";
            if (lower.endsWith(".pdf")) return "application/pdf";
        }
        return "image/jpeg";
    }
}
