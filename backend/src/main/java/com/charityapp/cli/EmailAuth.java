package com.charityapp.cli;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.docs.v1.DocsScopes;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.gmail.GmailScopes;
import com.google.api.services.sheets.v4.SheetsScopes;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

public class EmailAuth {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static java.io.File TOKENS_DIRECTORY;

    private static final List<String> SCOPES = Arrays.asList(
            GmailScopes.GMAIL_SEND,
            SheetsScopes.SPREADSHEETS,
            DriveScopes.DRIVE,
            DocsScopes.DOCUMENTS
    );

    public static Credential authorizeFromFile(String credentialsFilePath) throws IOException, GeneralSecurityException {
        String jsonContent = Files.readString(Paths.get(credentialsFilePath), java.nio.charset.StandardCharsets.UTF_8).trim();
        
        // Diagnostic checks on JSON format
        com.google.gson.JsonObject rootObj;
        try {
            rootObj = com.google.gson.JsonParser.parseString(jsonContent).getAsJsonObject();
        } catch (Exception e) {
            throw new IllegalArgumentException("Fișierul JSON de credențiale este invalid: " + e.getMessage());
        }

        if (rootObj.has("type") && "service_account".equalsIgnoreCase(rootObj.get("type").getAsString())) {
            throw new IllegalArgumentException("Fișierul furnizat este un Service Account JSON (cu private_key). Pentru trimiterea de emailuri cu Gmail (@gmail.com), trebuie să creați un 'OAuth 2.0 Client ID' (Desktop Application sau Web) în Google Cloud Console, nu un Service Account.");
        }

        // If client_id is at root level without "installed" or "web", automatically wrap it
        if (!rootObj.has("installed") && !rootObj.has("web")) {
            if (rootObj.has("client_id")) {
                com.google.gson.JsonObject wrapped = new com.google.gson.JsonObject();
                wrapped.add("installed", rootObj);
                jsonContent = wrapped.toString();
            } else {
                throw new IllegalArgumentException("JSON-ul de credențiale nu conține cheile 'installed', 'web' sau 'client_id'. Verificați că ați descărcat fișierul OAuth Client Secrets din Google Cloud Console.");
            }
        }

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, new StringReader(jsonContent));
        if (clientSecrets.getDetails() == null || clientSecrets.getDetails().getClientId() == null) {
            throw new IllegalArgumentException("Formatul OAuth Client Secrets nu conține un client_id valid.");
        }

        final var httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        if (TOKENS_DIRECTORY == null) {
            TOKENS_DIRECTORY = new java.io.File("tokens");
            TOKENS_DIRECTORY.mkdirs();
        }

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setDataStoreFactory(new FileDataStoreFactory(TOKENS_DIRECTORY))
                .setAccessType("offline")
                .build();

        LocalServerReceiver receiver = createReceiver();
        AuthorizationCodeInstalledApp app = new AuthorizationCodeInstalledApp(flow, receiver) {
            @Override
            protected void onAuthorization(com.google.api.client.auth.oauth2.AuthorizationCodeRequestUrl authorizationUrl) throws IOException {
                authorizationUrl.set("prompt", "consent");
                super.onAuthorization(authorizationUrl);
            }
        };
        return app.authorize("user");
    }

    private static int findFreePort() {
        int[] candidatePorts = {8888, 8889, 8989, 9090, 9999, 0};
        for (int p : candidatePorts) {
            try (java.net.ServerSocket socket = new java.net.ServerSocket(p)) {
                return socket.getLocalPort();
            } catch (Exception ignored) {}
        }
        return 8888;
    }

    private static LocalServerReceiver createReceiver() {
        int port = findFreePort();
        return new LocalServerReceiver.Builder().setPort(port).build();
    }

    public static Credential authorizeFromClientIdSecret(String clientId, String clientSecret) throws IOException, GeneralSecurityException {
        GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
        details.setClientId(clientId.trim());
        details.setClientSecret(clientSecret.trim());
        details.setAuthUri("https://accounts.google.com/o/oauth2/auth");
        details.setTokenUri("https://oauth2.googleapis.com/token");
        clientSecrets.setInstalled(details);

        final var httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        if (TOKENS_DIRECTORY == null) {
            TOKENS_DIRECTORY = new java.io.File("tokens");
            TOKENS_DIRECTORY.mkdirs();
        }

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setDataStoreFactory(new FileDataStoreFactory(TOKENS_DIRECTORY))
                .setAccessType("offline")
                .build();

        LocalServerReceiver receiver = createReceiver();
        AuthorizationCodeInstalledApp app = new AuthorizationCodeInstalledApp(flow, receiver) {
            @Override
            protected void onAuthorization(com.google.api.client.auth.oauth2.AuthorizationCodeRequestUrl authorizationUrl) throws IOException {
                authorizationUrl.set("prompt", "consent");
                super.onAuthorization(authorizationUrl);
            }
        };
        return app.authorize("user");
    }

    public static Credential authorizeFromEnv() throws IOException, GeneralSecurityException {
        String clientId = System.getenv("GOOGLE_CLIENT_ID");
        String clientSecret = System.getenv("GOOGLE_CLIENT_SECRET");
        if (clientId == null) clientId = System.getenv("GMAIL_CLIENT_ID");
        if (clientSecret == null) clientSecret = System.getenv("GMAIL_CLIENT_SECRET");

        String credentialsJson = System.getenv("GOOGLE_OAUTH_CREDENTIALS_JSON");
        if (credentialsJson == null || credentialsJson.isBlank()) {
            credentialsJson = System.getenv("GMAIL_CREDENTIALS_JSON");
        }
        if (credentialsJson == null || credentialsJson.isBlank()) {
            credentialsJson = System.getenv("GOOGLE_CREDENTIALS_JSON");
        }

        // Check .env files if not in system environment
        if ((credentialsJson == null || credentialsJson.isBlank()) && (clientId == null || clientSecret == null)) {
            String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
            for (String envPath : envFiles) {
                String envContent = tryReadFile(envPath);
                if (envContent != null) {
                    if (clientId == null) clientId = extractFromEnv(envContent, "GOOGLE_CLIENT_ID");
                    if (clientId == null) clientId = extractFromEnv(envContent, "GMAIL_CLIENT_ID");
                    if (clientSecret == null) clientSecret = extractFromEnv(envContent, "GOOGLE_CLIENT_SECRET");
                    if (clientSecret == null) clientSecret = extractFromEnv(envContent, "GMAIL_CLIENT_SECRET");

                    if (credentialsJson == null) credentialsJson = extractFromEnv(envContent, "GMAIL_CREDENTIALS_JSON");
                    if (credentialsJson == null) credentialsJson = extractFromEnv(envContent, "GOOGLE_OAUTH_CREDENTIALS_JSON");
                    if (credentialsJson == null) credentialsJson = extractFromEnv(envContent, "GOOGLE_CREDENTIALS_JSON");
                    if (credentialsJson != null && !credentialsJson.isBlank()) {
                        break;
                    }
                }
            }
        }

        if (clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank()) {
            return authorizeFromClientIdSecret(clientId, clientSecret);
        }

        if (credentialsJson == null || credentialsJson.isBlank()) {
            // Check default file paths
            String[] candidateFiles = new String[] { "credentials.json", "backend/credentials.json", "client_secret.json", "backend/client_secret.json" };
            for (String file : candidateFiles) {
                if (Files.exists(Paths.get(file))) {
                    return authorizeFromFile(file);
                }
            }
            throw new RuntimeException("GOOGLE_OAUTH_CREDENTIALS_JSON or GMAIL_CREDENTIALS_JSON env var is missing (or credentials.json / .env file).");
        }

        // Write credentials JSON to temp file
        java.io.File tempCredentials = java.io.File.createTempFile("google-credentials", ".json");
        try (FileWriter writer = new FileWriter(tempCredentials)) {
            writer.write(credentialsJson);
        }

        String tokenDirPath = System.getenv().getOrDefault("TOKENS_DIR", "tokens");
        TOKENS_DIRECTORY = new java.io.File(tokenDirPath);
        TOKENS_DIRECTORY.mkdirs();

        String tokensBase64 = System.getenv("GMAIL_TOKENS_JSON");
        if (tokensBase64 != null && !tokensBase64.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(tokensBase64);
            java.io.File tokenFile = new java.io.File(TOKENS_DIRECTORY, "StoredCredential");
            try (FileOutputStream fos = new FileOutputStream(tokenFile)) {
                fos.write(decoded);
            }
        }

        return authorizeFromFile(tempCredentials.getAbsolutePath());
    }

    private static String tryReadFile(String filePath) {
        if (filePath == null || filePath.isBlank()) return null;
        try {
            java.nio.file.Path path = Paths.get(filePath.trim());
            if (Files.exists(path) && !Files.isDirectory(path)) {
                return Files.readString(path, java.nio.charset.StandardCharsets.UTF_8).trim();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static String extractFromEnv(String envContent, String key) {
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

    public static void main(String[] args) {
        try {
            System.out.println("=== Charity Google OAuth 2.0 Authorization CLI ===");
            System.out.println("Scopes requested: Gmail Send, Sheets, Full Drive, Docs");
            Credential credential;
            if (args.length >= 2 && !args[0].isBlank() && !args[1].isBlank()) {
                credential = authorizeFromClientIdSecret(args[0], args[1]);
            } else if (args.length == 1 && args[0] != null && !args[0].isBlank()) {
                credential = authorizeFromFile(args[0]);
            } else {
                credential = authorizeFromEnv();
            }

            System.out.println("\n========================================================");
            System.out.println("AUTHORIZATION SUCCESSFUL!");
            if (credential.getRefreshToken() != null) {
                System.out.println("YOUR REFRESH TOKEN (copy to .env as GOOGLE_REFRESH_TOKEN):");
                System.out.println(credential.getRefreshToken());
            } else {
                System.out.println("Refresh token stored in: " + (TOKENS_DIRECTORY != null ? TOKENS_DIRECTORY.getAbsolutePath() : "tokens"));
            }
            System.out.println("========================================================\n");
        } catch (Exception e) {
            System.err.println("Authorization error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
