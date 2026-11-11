package com.charityapp.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Component
@SuppressWarnings("deprecation")
public class GoogleCredentialFactory {

    private static final Logger log = LoggerFactory.getLogger(GoogleCredentialFactory.class);
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final Gson gson = new Gson();

    private final AppConfigProperties properties;

    public GoogleCredentialFactory(AppConfigProperties properties) {
        this.properties = properties;
    }

    public GoogleClientSecrets loadClientSecrets(String json) throws IOException {
        if (json == null || json.isBlank()) return null;
        String clean = json.trim();
        try {
            com.google.gson.JsonObject rootObj = com.google.gson.JsonParser.parseString(clean).getAsJsonObject();
            if (!rootObj.has("installed") && !rootObj.has("web")) {
                if (rootObj.has("client_id") || rootObj.has("client_secret")) {
                    com.google.gson.JsonObject wrapped = new com.google.gson.JsonObject();
                    wrapped.add("installed", rootObj);
                    clean = wrapped.toString();
                }
            }
        } catch (Exception ignored) {}

        GoogleClientSecrets secrets = GoogleClientSecrets.load(JSON_FACTORY, new StringReader(clean));
        if (secrets != null && secrets.getDetails() != null && secrets.getDetails().getClientId() != null) {
            return secrets;
        }

        // Fallback: Check if client details can be constructed from separate keys or env vars
        String clientId = null;
        String clientSecret = null;
        try {
            com.google.gson.JsonObject rootObj = com.google.gson.JsonParser.parseString(clean).getAsJsonObject();
            if (rootObj.has("client_id")) clientId = rootObj.get("client_id").getAsString();
            if (rootObj.has("client_secret")) clientSecret = rootObj.get("client_secret").getAsString();
        } catch (Exception ignored) {}

        if (clientId == null) clientId = System.getenv("GOOGLE_CLIENT_ID");
        if (clientId == null) clientId = System.getenv("GMAIL_CLIENT_ID");
        if (clientId == null) clientId = System.getenv("GOOGLE_OAUTH_CLIENT_ID");
        if (clientSecret == null) clientSecret = System.getenv("GOOGLE_CLIENT_SECRET");
        if (clientSecret == null) clientSecret = System.getenv("GMAIL_CLIENT_SECRET");

        if (clientId != null && clientSecret != null) {
            GoogleClientSecrets fallback = new GoogleClientSecrets();
            GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
            details.setClientId(clientId.trim());
            details.setClientSecret(clientSecret.trim());
            fallback.setInstalled(details);
            return fallback;
        }

        return secrets;
    }

    public GoogleCredential createCredential(List<String> scopes, String domain) throws Exception {
        String refreshToken = resolveRefreshToken(domain);

        // 1. If refresh token is present, strictly try OAuth flow first
        if (refreshToken != null && !refreshToken.isBlank()) {
            String oauthJson = resolveOAuthCredentialsJson(domain);
            if (oauthJson != null && !oauthJson.isBlank()) {
                GoogleClientSecrets clientSecrets = loadClientSecrets(oauthJson);

                GoogleCredential credential = new GoogleCredential.Builder()
                        .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                        .setJsonFactory(JSON_FACTORY)
                        .setClientSecrets(clientSecrets)
                        .build()
                        .setRefreshToken(refreshToken.trim());

                try {
                    credential.refreshToken();
                    log.info("Successfully initialized and refreshed Google OAuth2 user credential for domain: {}", domain);
                } catch (Exception e) {
                    log.warn("OAuth token refresh notice for domain {}: {}", domain, e.getMessage());
                }

                return credential;
            }
        }

        // 2. Fallback to Service Account flow
        String credJson = resolveCredentialsJson(domain);
        if (credJson == null || credJson.isBlank()) {
            throw new IllegalStateException("Google credentials not configured for domain: " + domain);
        }

        if (isOAuthClientSecrets(credJson)) {
            if (refreshToken == null || refreshToken.isBlank()) {
                throw new IllegalStateException("OAuth client secrets configured but refresh token is missing. Configure GOOGLE_REFRESH_TOKEN or GMAIL_REFRESH_TOKEN.");
            }
            GoogleClientSecrets clientSecrets = loadClientSecrets(credJson);
            return new GoogleCredential.Builder()
                    .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                    .setJsonFactory(JSON_FACTORY)
                    .setClientSecrets(clientSecrets)
                    .build()
                    .setRefreshToken(refreshToken.trim());
        }

        InputStream stream = new ByteArrayInputStream(credJson.getBytes(StandardCharsets.UTF_8));
        return GoogleCredential.fromStream(stream).createScoped(scopes);
    }

    public boolean isOAuthClientSecrets(String json) {
        if (json == null || json.isBlank()) return false;
        String clean = json.trim();
        return (clean.contains("\"installed\"") || clean.contains("\"web\"") || clean.contains("\"client_id\""))
                && !clean.contains("\"private_key\"");
    }

    public String resolveOAuthCredentialsJson(String domain) {
        // Check properties
        if (properties != null) {
            if (properties.getGmail() != null && isOAuthClientSecrets(properties.getGmail().getCredentialsJson())) {
                return properties.getGmail().getCredentialsJson();
            }
            if (properties.getGoogle() != null) {
                if (isOAuthClientSecrets(properties.getGoogle().getCredentialsJson())) {
                    return properties.getGoogle().getCredentialsJson();
                }
                if (properties.getGoogle().getSheets() != null && isOAuthClientSecrets(properties.getGoogle().getSheets().getCredentialsJson())) {
                    return properties.getGoogle().getSheets().getCredentialsJson();
                }
                if (properties.getGoogle().getDrive() != null && isOAuthClientSecrets(properties.getGoogle().getDrive().getCredentialsJson())) {
                    return properties.getGoogle().getDrive().getCredentialsJson();
                }
            }
        }

        // Check env vars
        String[] envVars = new String[] {
                "GOOGLE_OAUTH_CREDENTIALS_JSON",
                "GMAIL_CREDENTIALS_JSON",
                "GOOGLE_CREDENTIALS_JSON",
                "GOOGLE_SHEETS_CREDENTIALS_JSON",
                "GOOGLE_DRIVE_CREDENTIALS_JSON"
        };
        for (String var : envVars) {
            String val = System.getenv(var);
            if (!isBlank(val)) {
                val = val.trim();
                if (!val.startsWith("{")) {
                    String fileContent = tryReadFile(val);
                    if (isOAuthClientSecrets(fileContent)) return fileContent;
                } else if (isOAuthClientSecrets(val)) {
                    return val;
                }
            }
        }

        // Check local files
        String[] files = new String[] {
                "credentials.json",
                "backend/credentials.json",
                "backend/src/main/resources/credentials.json",
                "client_secret.json"
        };
        for (String f : files) {
            String content = tryReadFile(f);
            if (isOAuthClientSecrets(content)) return content;
        }

        // Check .env
        String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
        for (String envPath : envFiles) {
            String envContent = tryReadFile(envPath);
            if (envContent != null) {
                for (String var : envVars) {
                    String extracted = extractFromEnv(envContent, var);
                    if (isOAuthClientSecrets(extracted)) return extracted;
                }
            }
        }

        return null;
    }

    public String resolveCredentialsJson(String domain) {
        String oauth = resolveOAuthCredentialsJson(domain);
        if (oauth != null && resolveRefreshToken(domain) != null) {
            return oauth;
        }

        // 1. Domain-specific properties
        if (properties != null) {
            if ("gmail".equalsIgnoreCase(domain) && properties.getGmail() != null && !isBlank(properties.getGmail().getCredentialsJson())) {
                return properties.getGmail().getCredentialsJson();
            }
            if (properties.getGoogle() != null) {
                if ("sheets".equalsIgnoreCase(domain) && properties.getGoogle().getSheets() != null && !isBlank(properties.getGoogle().getSheets().getCredentialsJson())) {
                    return properties.getGoogle().getSheets().getCredentialsJson();
                }
                if ("docs".equalsIgnoreCase(domain) && properties.getGoogle().getDocs() != null && !isBlank(properties.getGoogle().getDocs().getCredentialsJson())) {
                    return properties.getGoogle().getDocs().getCredentialsJson();
                }
                if ("drive".equalsIgnoreCase(domain) && properties.getGoogle().getDrive() != null && !isBlank(properties.getGoogle().getDrive().getCredentialsJson())) {
                    return properties.getGoogle().getDrive().getCredentialsJson();
                }
                if (!isBlank(properties.getGoogle().getCredentialsJson())) {
                    return properties.getGoogle().getCredentialsJson();
                }
            }
        }

        // 2. Environment Variables
        String cred = null;
        if ("gmail".equalsIgnoreCase(domain)) cred = System.getenv("GMAIL_CREDENTIALS_JSON");
        if (isBlank(cred) && "sheets".equalsIgnoreCase(domain)) cred = System.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON");
        if (isBlank(cred) && "docs".equalsIgnoreCase(domain)) cred = System.getenv("GOOGLE_DOCS_CREDENTIALS_JSON");
        if (isBlank(cred) && "drive".equalsIgnoreCase(domain)) cred = System.getenv("GOOGLE_DRIVE_CREDENTIALS_JSON");
        if (isBlank(cred)) cred = System.getenv("GOOGLE_OAUTH_CREDENTIALS_JSON");
        if (isBlank(cred)) cred = System.getenv("GOOGLE_CREDENTIALS_JSON");
        if (isBlank(cred)) cred = System.getenv("GMAIL_CREDENTIALS_JSON");
        if (isBlank(cred)) cred = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");

        if (!isBlank(cred)) {
            cred = cred.trim();
            if (!cred.startsWith("{")) {
                String fileContent = tryReadFile(cred);
                if (fileContent != null) return fileContent;
            } else {
                return cred;
            }
        }

        // 3. Auto-discover candidate files
        String[] candidateFiles = new String[] {
                "credentials.json",
                "backend/credentials.json",
                "service-account.json",
                "backend/service-account.json",
                "backend/src/main/resources/service-account.json",
                "google-credentials.json",
                "backend/google-credentials.json"
        };
        for (String path : candidateFiles) {
            String content = tryReadFile(path);
            if (content != null && (content.contains("\"private_key\"") || content.contains("\"client_id\""))) {
                return content;
            }
        }

        // 4. Check .env files
        String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
        for (String envPath : envFiles) {
            String envContent = tryReadFile(envPath);
            if (envContent != null) {
                if ("gmail".equalsIgnoreCase(domain)) {
                    String extracted = extractFromEnv(envContent, "GMAIL_CREDENTIALS_JSON");
                    if (extracted != null) return extracted;
                }
                String extracted = extractFromEnv(envContent, "GOOGLE_SHEETS_CREDENTIALS_JSON");
                if (extracted == null) extracted = extractFromEnv(envContent, "GOOGLE_OAUTH_CREDENTIALS_JSON");
                if (extracted == null) extracted = extractFromEnv(envContent, "GOOGLE_CREDENTIALS_JSON");
                if (extracted == null) extracted = extractFromEnv(envContent, "GMAIL_CREDENTIALS_JSON");
                if (extracted != null) return extracted;
            }
        }

        return null;
    }

    public String resolveRefreshToken(String domain) {
        if (properties != null) {
            if ("gmail".equalsIgnoreCase(domain) && properties.getGmail() != null && !isBlank(properties.getGmail().getRefreshToken())) {
                return properties.getGmail().getRefreshToken();
            }
            if (properties.getGoogle() != null) {
                if ("sheets".equalsIgnoreCase(domain) && properties.getGoogle().getSheets() != null && !isBlank(properties.getGoogle().getSheets().getRefreshToken())) {
                    return properties.getGoogle().getSheets().getRefreshToken();
                }
                if ("docs".equalsIgnoreCase(domain) && properties.getGoogle().getDocs() != null && !isBlank(properties.getGoogle().getDocs().getRefreshToken())) {
                    return properties.getGoogle().getDocs().getRefreshToken();
                }
                if ("drive".equalsIgnoreCase(domain) && properties.getGoogle().getDrive() != null && !isBlank(properties.getGoogle().getDrive().getRefreshToken())) {
                    return properties.getGoogle().getDrive().getRefreshToken();
                }
                if (!isBlank(properties.getGoogle().getRefreshToken())) {
                    return properties.getGoogle().getRefreshToken();
                }
            }
            if (properties.getGmail() != null && !isBlank(properties.getGmail().getRefreshToken())) {
                return properties.getGmail().getRefreshToken();
            }
        }

        String token = null;
        if ("gmail".equalsIgnoreCase(domain)) token = System.getenv("GMAIL_REFRESH_TOKEN");
        if (isBlank(token)) token = System.getenv("GOOGLE_REFRESH_TOKEN");
        if (isBlank(token)) token = System.getenv("GOOGLE_OAUTH_REFRESH_TOKEN");
        if (isBlank(token)) token = System.getenv("GMAIL_REFRESH_TOKEN");
        if (isBlank(token)) token = System.getenv("GOOGLE_SHEETS_REFRESH_TOKEN");
        if (isBlank(token)) token = System.getenv("GOOGLE_DRIVE_REFRESH_TOKEN");

        if (!isBlank(token)) return token.trim();

        // Check .env files
        String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
        for (String envPath : envFiles) {
            String envContent = tryReadFile(envPath);
            if (envContent != null) {
                String extracted = extractFromEnv(envContent, "GOOGLE_REFRESH_TOKEN");
                if (extracted == null) extracted = extractFromEnv(envContent, "GOOGLE_OAUTH_REFRESH_TOKEN");
                if (extracted == null) extracted = extractFromEnv(envContent, "GMAIL_REFRESH_TOKEN");
                if (extracted != null) return extracted.trim();
            }
        }

        return null;
    }

    public String getAccountEmailOrClientId(String domain) {
        String json = resolveCredentialsJson(domain);
        if (json == null || json.isBlank()) return null;
        try {
            Map<?, ?> map = gson.fromJson(json, Map.class);
            if (map.containsKey("client_email")) {
                return (String) map.get("client_email");
            }
            if (map.containsKey("installed")) {
                Map<?, ?> installed = (Map<?, ?>) map.get("installed");
                return (String) installed.get("client_id");
            }
            if (map.containsKey("web")) {
                Map<?, ?> web = (Map<?, ?>) map.get("web");
                return (String) web.get("client_id");
            }
            if (map.containsKey("client_id")) {
                return (String) map.get("client_id");
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String tryReadFile(String filePath) {
        if (isBlank(filePath)) return null;
        try {
            Path path = Paths.get(filePath.trim());
            if (Files.exists(path) && !Files.isDirectory(path)) {
                return Files.readString(path, StandardCharsets.UTF_8).trim();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String extractFromEnv(String envContent, String key) {
        if (envContent == null || key == null) return null;
        for (String line : envContent.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("#") || !trimmed.contains("=")) continue;
            int idx = trimmed.indexOf('=');
            String k = trimmed.substring(0, idx).trim();
            String v = trimmed.substring(idx + 1).trim();
            if (k.equals(key)) {
                if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.substring(1, v.length() - 1);
                }
                return v;
            }
        }
        return null;
    }

    private boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
}
