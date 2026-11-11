package com.charityapp.service.hr;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.charityapp.config.AppConfigProperties;
import com.charityapp.dto.hr.FeedbackThemeDto;
import com.charityapp.model.hr.VolunteerFeedback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class GeminiFeedbackAnalysisService {
    private static final Logger log = LoggerFactory.getLogger(GeminiFeedbackAnalysisService.class);

    private final String apiKey;
    private final String primaryModel;
    private final List<String> candidateModels;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private final Map<String, CacheEntry> themeCache = new java.util.concurrent.ConcurrentHashMap<>();

    private record CacheEntry(List<FeedbackThemeDto> themes, long expiresAt) {}

    public GeminiFeedbackAnalysisService(
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

    public List<FeedbackThemeDto> analyzeFeedbackThemes(List<VolunteerFeedback> feedbackList) {
        return analyzeFeedbackThemes(feedbackList, Collections.emptyList());
    }

    public List<FeedbackThemeDto> analyzeFeedbackThemes(List<VolunteerFeedback> feedbackList, List<String> existingCategoryNames) {
        if (feedbackList == null || feedbackList.isEmpty()) {
            return Collections.emptyList();
        }

        // Cache fingerprint based on item IDs and statuses
        StringBuilder cacheKeyBuilder = new StringBuilder();
        cacheKeyBuilder.append("count=").append(feedbackList.size()).append(";ids=");
        for (VolunteerFeedback item : feedbackList) {
            cacheKeyBuilder.append(item.getId()).append(":").append(item.getStatus()).append(",");
        }
        String cacheKey = cacheKeyBuilder.toString();
        CacheEntry cached = themeCache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() < cached.expiresAt()) {
            log.info("Returning cached Gemini feedback themes (valid for {} more seconds)", (cached.expiresAt() - System.currentTimeMillis()) / 1000);
            return cached.themes();
        }

        if (apiKey.isBlank()) {
            log.warn("Google Gemini API Key is not configured for feedback clustering analysis.");
            return generateLocalFallbackThemes(feedbackList);
        }

        StringBuilder sb = new StringBuilder("List of volunteer feedback entries:\n\n");
        int count = 0;
        for (VolunteerFeedback item : feedbackList) {
            count++;
            String idStr = item.getId() != null ? item.getId().toString() : ("item-" + count);
            sb.append("- [ID: ").append(idStr).append("]")
              .append(" [Type: ").append(item.getType() != null ? item.getType() : "GENERAL").append("]")
              .append(" [Category: ").append(item.getCategoryName() != null ? item.getCategoryName() : "General").append("] ")
              .append("\"").append(item.getContent() != null ? item.getContent().replace("\n", " ").trim() : "").append("\"\n");
            if (count >= 100) break; // cap at 100 items for token economy
        }

        String promptText = """
            You are an expert HR and operations analyst. Analyze the following volunteer complaints, suggestions, and feedback entries.

            CONTEXT & OBJECTIVE:
            Volunteers have already picked broad categories (such as Logistică, Coordonare, HR, Standuri, etc.) when submitting.
            Do NOT cluster into broad categories. Instead, your goal is to discover SPECIFIC, GRANULAR operational issues, recurring pain points, friction with specific individuals/coordinators, broken or missing equipment/items, or notable recurring praises.

            Examples of granular operational clusters:
            - Problems with a specific coordinator or person (e.g. 'Probleme Coordonator Mihai', 'Comunicare Defectuoasă Coordonator X')
            - Specific broken, malfunctioning, or missing equipment/inventory (e.g. 'Ceainic defect / Lipsă apă caldă', 'Lipsă pahare & consumabile', 'Probleme scanner QR')
            - Specific logistical friction, shifts, or timing (e.g. 'Întârzieri schimb de tură', 'Probleme acces parcare')
            - Specific notable praise (e.g. 'Aprecieri echipă logistică')

            Instructions:
            1. Formulate 2 to 6 specific operational clusters based on the actual details mentioned in the text.
            2. For each cluster:
               - theme: Short, concrete title in Romanian (2 to 4 words) describing the specific concrete issue, person, or broken item.
               - count: Number of feedback entries matching this specific issue.
               - sentiment: 'POSITIVE', 'NEGATIVE', or 'NEUTRAL'.
               - summary: One concise sentence in Romanian explaining what volunteers reported regarding this specific issue.
               - feedbackIds: Array of the exact ID strings of the feedback items that belong to this cluster (from the [ID: ...] tags).

            Return strictly a JSON array of cluster objects.
            """ + "\n" + sb.toString();

        Map<String, Object> schemaItem = new LinkedHashMap<>();
        schemaItem.put("theme", Map.of("type", "STRING", "description", "Short, concrete title in Romanian describing the specific issue or topic (2-4 words)"));
        schemaItem.put("count", Map.of("type", "INTEGER", "description", "Count of feedback items matching this specific theme"));
        schemaItem.put("sentiment", Map.of("type", "STRING", "description", "Sentiment: POSITIVE, NEGATIVE, or NEUTRAL"));
        schemaItem.put("summary", Map.of("type", "STRING", "description", "One concise sentence summarizing the specific issue in Romanian"));
        schemaItem.put("feedbackIds", Map.of(
                "type", "ARRAY",
                "items", Map.of("type", "STRING"),
                "description", "List of feedback item IDs belonging to this cluster"
        ));

        Map<String, Object> responseSchema = Map.of(
                "type", "ARRAY",
                "items", Map.of(
                        "type", "OBJECT",
                        "properties", schemaItem,
                        "required", List.of("theme", "count", "sentiment", "summary", "feedbackIds")
                )
        );

        Map<String, Object> generationConfig = Map.of(
                "response_mime_type", "application/json",
                "response_schema", responseSchema,
                "temperature", 0.2
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", promptText)))),
                "generationConfig", generationConfig
        );

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(requestBody);
        } catch (Exception e) {
            log.error("Failed to build Gemini request payload for feedback analysis: {}", e.getMessage());
            return generateLocalFallbackThemes(feedbackList);
        }

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
                    List<FeedbackThemeDto> themes = parseGeminiThemesResponse(response.body());
                    if (!themes.isEmpty()) {
                        themeCache.put(cacheKey, new CacheEntry(themes, System.currentTimeMillis() + 600_000L));
                    }
                    return themes;
                }
                log.warn("Gemini model {} returned status {} during feedback theme clustering", targetModel, response.statusCode());
            } catch (Exception e) {
                log.warn("Exception during Gemini feedback analysis with model {}: {}", targetModel, e.getMessage());
            }
        }

        List<FeedbackThemeDto> fallback = generateLocalFallbackThemes(feedbackList);
        themeCache.put(cacheKey, new CacheEntry(fallback, System.currentTimeMillis() + 60_000L));
        return fallback;
    }

    private List<FeedbackThemeDto> parseGeminiThemesResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isEmpty()) return Collections.emptyList();

            JsonNode contentParts = candidates.get(0).path("content").path("parts");
            if (contentParts.isEmpty()) return Collections.emptyList();

            String rawJson = contentParts.get(0).path("text").asText();
            JsonNode arrayNode = objectMapper.readTree(rawJson);

            List<FeedbackThemeDto> themes = new ArrayList<>();
            if (arrayNode.isArray()) {
                for (JsonNode item : arrayNode) {
                    String theme = item.path("theme").asText("");
                    int count = item.path("count").asInt(1);
                    String sentiment = item.path("sentiment").asText("NEUTRAL").toUpperCase();
                    String summary = item.path("summary").asText("");
                    List<String> feedbackIds = new ArrayList<>();
                    JsonNode idsNode = item.path("feedbackIds");
                    if (idsNode.isArray()) {
                        for (JsonNode idNode : idsNode) {
                            String id = idNode.asText("");
                            if (!id.isBlank()) feedbackIds.add(id);
                        }
                    }
                    if (!theme.isBlank()) {
                        themes.add(new FeedbackThemeDto(theme, count, sentiment, summary, false, feedbackIds));
                    }
                }
            }
            return themes;
        } catch (Exception e) {
            log.error("Failed to parse Gemini feedback themes response: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<FeedbackThemeDto> generateLocalFallbackThemes(List<VolunteerFeedback> feedbackList) {
        Map<String, List<String>> categoryItemIds = new LinkedHashMap<>();
        for (VolunteerFeedback item : feedbackList) {
            String cat = item.getCategoryName() != null ? item.getCategoryName() : "General";
            categoryItemIds.computeIfAbsent(cat, k -> new ArrayList<>())
                    .add(item.getId() != null ? item.getId().toString() : "");
        }

        List<FeedbackThemeDto> themes = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : categoryItemIds.entrySet()) {
            themes.add(new FeedbackThemeDto(
                    entry.getKey(),
                    entry.getValue().size(),
                    "NEUTRAL",
                    entry.getValue().size() + " mențiuni înregistrate în categoria " + entry.getKey(),
                    false,
                    entry.getValue()
            ));
        }
        return themes;
    }

    public void invalidateCache() {
        themeCache.clear();
    }
}
