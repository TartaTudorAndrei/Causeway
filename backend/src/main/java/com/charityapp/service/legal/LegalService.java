package com.charityapp.service.legal;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.docs.v1.Docs;
import com.google.api.services.docs.v1.DocsScopes;
import com.google.api.services.docs.v1.model.BatchUpdateDocumentRequest;
import com.google.api.services.docs.v1.model.Document;
import com.google.api.services.docs.v1.model.ParagraphElement;
import com.google.api.services.docs.v1.model.ReplaceAllTextRequest;
import com.google.api.services.docs.v1.model.Request;
import com.google.api.services.docs.v1.model.StructuralElement;
import com.google.api.services.docs.v1.model.SubstringMatchCriteria;
import com.google.api.services.docs.v1.model.TableCell;
import com.google.api.services.docs.v1.model.TableRow;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.gson.Gson;
import com.charityapp.config.AppConfigProperties;
import com.charityapp.dto.legal.GenerateContractRequest;
import com.charityapp.dto.legal.GoogleDocImportRequest;
import com.charityapp.dto.legal.GoogleDocImportResponse;
import com.charityapp.dto.legal.LegalStatsDTO;
import com.charityapp.model.legal.ContractTemplate;
import com.charityapp.model.legal.GeneratedContract;
import com.charityapp.repository.legal.LegalRepository;
import com.charityapp.event.DashboardDataChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@SuppressWarnings("deprecation")
public class LegalService {

    private static final Logger log = LoggerFactory.getLogger(LegalService.class);
    private final LegalRepository legalRepository;
    private final AppConfigProperties properties;
    private final ApplicationEventPublisher eventPublisher;
    private final Gson gson = new Gson();
    private final java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
            .followRedirects(java.net.http.HttpClient.Redirect.ALWAYS)
            .connectTimeout(java.time.Duration.ofSeconds(20))
            .build();

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{([a-zA-Z0-9_\\-\\s]+)\\}\\}");
    private static final Pattern BRACKET_PATTERN = Pattern.compile("\\[([A-Z0-9_]{3,})\\]");
    private static final Pattern DOC_ID_PATTERN = Pattern.compile("(?:/file/d/|/d/|id=|open\\?id=)([a-zA-Z0-9_-]{15,})");
    private static final Pattern TITLE_TAG_PATTERN = Pattern.compile("<title>(.*?)</title>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final com.charityapp.config.GoogleCredentialFactory credentialFactory;
    private final com.charityapp.service.google.GoogleDriveService googleDriveService;

    public LegalService(
            LegalRepository legalRepository,
            AppConfigProperties properties,
            ApplicationEventPublisher eventPublisher,
            com.charityapp.config.GoogleCredentialFactory credentialFactory,
            @org.springframework.context.annotation.Lazy com.charityapp.service.google.GoogleDriveService googleDriveService) {
        this.legalRepository = legalRepository;
        this.properties = properties;
        this.eventPublisher = eventPublisher;
        this.credentialFactory = credentialFactory;
        this.googleDriveService = googleDriveService;
    }

    // ================= GOOGLE API CLIENTS & CREDENTIAL DISCOVERY =================

    public Map<String, Object> getGoogleStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        // Check if Apps Script is configured (primary 100% native engine)
        String appsScriptUrl = getAppsScriptUrl();
        if (appsScriptUrl != null && !appsScriptUrl.isBlank()) {
            status.put("connected", true);
            status.put("mode", "apps_script");
            status.put("message", "Google Apps Script Engine Conectat (100% Vector PDF)");
            return status;
        }

        String json = getGoogleCredentialsJson();
        if (json == null || json.isBlank()) {
            status.put("connected", false);
            status.put("message", "Introduceți GOOGLE_OAUTH_CREDENTIALS_JSON sau GOOGLE_APPS_SCRIPT_URL în .env pentru generare documente.");
            return status;
        }

        try {
            boolean isOAuth = credentialFactory.isOAuthClientSecrets(json);
            String identifier = credentialFactory.getAccountEmailOrClientId("docs");
            status.put("connected", true);
            status.put("mode", isOAuth ? "oauth_user" : "service_account");
            status.put("clientEmail", identifier);
            status.put("message", "Conectat la Google Docs & Drive API (" + identifier + ")");
        } catch (Exception e) {
            status.put("connected", false);
            status.put("message", "Eroare la parsarea credențialelor: " + e.getMessage());
        }
        return status;
    }

    public String getAppsScriptUrl() {
        String url = null;
        if (properties != null && properties.getGoogle() != null) {
            url = properties.getGoogle().getAppsScriptUrl();
        }
        if (isBlank(url)) url = System.getenv("GOOGLE_APPS_SCRIPT_URL");
        if (isBlank(url)) {
            String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
            for (String envPath : envFiles) {
                String envContent = tryReadFile(envPath);
                if (envContent != null) {
                    String extracted = extractFromEnv(envContent, "GOOGLE_APPS_SCRIPT_URL");
                    if (extracted != null && !extracted.isBlank()) {
                        url = extracted.trim();
                        break;
                    }
                }
            }
        }
        return isBlank(url) ? null : url.trim();
    }

    public String getAppsScriptSecret() {
        String secret = null;
        if (properties != null && properties.getGoogle() != null) {
            secret = properties.getGoogle().getAppsScriptSecret();
        }
        if (isBlank(secret)) secret = System.getenv("GOOGLE_APPS_SCRIPT_SECRET");
        if (isBlank(secret)) {
            String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
            for (String envPath : envFiles) {
                String envContent = tryReadFile(envPath);
                if (envContent != null) {
                    String extracted = extractFromEnv(envContent, "GOOGLE_APPS_SCRIPT_SECRET");
                    if (extracted != null && !extracted.isBlank()) {
                        secret = extracted.trim();
                        break;
                    }
                }
            }
        }
        return isBlank(secret) ? "app_legal_secret" : secret.trim();
    }

    private Docs getDocsService() {
        try {
            GoogleCredential credential = credentialFactory.createCredential(
                    Arrays.asList(DocsScopes.DOCUMENTS, DriveScopes.DRIVE, DriveScopes.DRIVE_FILE),
                    "docs"
            );

            return new Docs.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    credential)
                    .setApplicationName("Charity Legal")
                    .build();
        } catch (Exception e) {
            log.warn("Could not initialize Google Docs client: {}", e.getMessage());
            return null;
        }
    }

    private Drive getDriveService() {
        try {
            GoogleCredential credential = credentialFactory.createCredential(
                    Arrays.asList(DocsScopes.DOCUMENTS, DriveScopes.DRIVE, DriveScopes.DRIVE_FILE),
                    "drive"
            );

            return new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    credential)
                    .setApplicationName("Charity Legal")
                    .build();
        } catch (Exception e) {
            log.warn("Could not initialize Google Drive client: {}", e.getMessage());
            return null;
        }
    }

    public String getGoogleCredentialsJson() {
        return credentialFactory.resolveCredentialsJson("docs");
    }

    private boolean isBlank(String s) {
        if (s == null) return true;
        String t = s.trim();
        return t.isEmpty() || t.startsWith("${") && t.endsWith(":}");
    }

    private String tryReadFile(String filePath) {
        try {
            java.io.File file = new java.io.File(filePath);
            if (file.exists() && file.isFile()) {
                return java.nio.file.Files.readString(file.toPath(), StandardCharsets.UTF_8).trim();
            }
            InputStream is = getClass().getClassLoader().getResourceAsStream(filePath);
            if (is != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line).append("\n");
                    return sb.toString().trim();
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String extractFromEnv(String envFileContent, String varName) {
        Pattern p = Pattern.compile("^\\s*" + Pattern.quote(varName) + "\\s*=\\s*['\"]?(\\{.+?\\})['\"]?\\s*$", Pattern.DOTALL | Pattern.MULTILINE);
        Matcher m = p.matcher(envFileContent);
        if (m.find()) {
            return m.group(1).trim().replace("\\n", "\n");
        }
        // Also match single-line value
        Pattern p2 = Pattern.compile("^\\s*" + Pattern.quote(varName) + "\\s*=\\s*(.+)$", Pattern.MULTILINE);
        Matcher m2 = p2.matcher(envFileContent);
        if (m2.find()) {
            String val = m2.group(1).trim();
            if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith("\"") && val.endsWith("\""))) {
                val = val.substring(1, val.length() - 1);
            }
            return val.replace("\\n", "\n");
        }
        return null;
    }

    // ================= TEMPLATES =================

    public List<ContractTemplate> getAllTemplates() {
        return legalRepository.findAllTemplates();
    }

    public ContractTemplate getTemplateById(UUID id) {
        return legalRepository.findTemplateById(id).orElse(null);
    }

    public ContractTemplate createTemplate(ContractTemplate template) {
        if (template.getId() == null) {
            template.setId(UUID.randomUUID());
        }
        
        ContractTemplate saved = legalRepository.saveTemplate(template);
        // Auto-save/move template to Google Drive "Templates" folder in background
        CompletableFuture.runAsync(() -> ensureTemplateInTemplatesFolder(saved));

        return saved;
    }

    private void ensureTemplateInTemplatesFolder(ContractTemplate template) {
        try {
            Drive driveService = getDriveService();
            if (driveService == null || googleDriveService == null) return;

            String templatesFolderId = googleDriveService.getLegalTemplatesFolderId();
            if (templatesFolderId == null || templatesFolderId.isBlank()) return;

            String docId = extractDocId(template.getGoogleDocsUrl());
            if (docId != null && !docId.isBlank()) {
                // Check if doc is already in the templates folder
                File existingFile = driveService.files().get(docId)
                        .setSupportsAllDrives(true)
                        .setFields("id, name, parents")
                        .execute();

                if (existingFile != null) {
                    List<String> currentParents = existingFile.getParents();
                    boolean alreadyInTemplates = currentParents != null && currentParents.contains(templatesFolderId);
                    if (!alreadyInTemplates) {
                        // Add Templates folder as parent
                        driveService.files().update(docId, null)
                                .setAddParents(templatesFolderId)
                                .setSupportsAllDrives(true)
                                .execute();
                        log.info("Linked existing Google Doc {} to Legal/Templates folder {}", docId, templatesFolderId);
                    }
                }
            } else if (template.getRawContent() != null && !template.getRawContent().isBlank()) {
                // If no Google Doc URL provided but has content, create a new Google Doc in Templates folder
                File docMetadata = new File();
                docMetadata.setName(template.getTitle() != null ? template.getTitle() : "Template");
                docMetadata.setMimeType("application/vnd.google-apps.document");
                docMetadata.setParents(Collections.singletonList(templatesFolderId));

                File createdDoc = driveService.files().create(docMetadata)
                        .setSupportsAllDrives(true)
                        .setFields("id, name, webViewLink")
                        .execute();

                if (createdDoc != null && createdDoc.getId() != null) {
                    template.setGoogleDocsUrl("https://docs.google.com/document/d/" + createdDoc.getId() + "/edit");
                    log.info("Created new Google Doc {} in Legal/Templates folder for template '{}'", createdDoc.getId(), template.getTitle());

                    // Populate initial raw content into Google Doc
                    Docs docsService = getDocsService();
                    if (docsService != null && template.getRawContent() != null && !template.getRawContent().isBlank()) {
                        try {
                            List<Request> requests = Collections.singletonList(new Request().setInsertText(
                                    new com.google.api.services.docs.v1.model.InsertTextRequest()
                                            .setLocation(new com.google.api.services.docs.v1.model.Location().setIndex(1))
                                            .setText(template.getRawContent())
                            ));
                            docsService.documents().batchUpdate(createdDoc.getId(), new BatchUpdateDocumentRequest().setRequests(requests))
                                    .execute();
                        } catch (Exception e) {
                            log.debug("Could not populate text in new template doc: {}", e.getMessage());
                        }
                    }
                    legalRepository.updateTemplate(template);
                }
            }
        } catch (Exception e) {
            log.warn("Could not ensure template in Google Drive templates folder: {}", e.getMessage());
        }
    }

    public ContractTemplate updateTemplate(UUID id, ContractTemplate template) {
        template.setId(id);
        legalRepository.updateTemplate(template);
        CompletableFuture.runAsync(() -> ensureTemplateInTemplatesFolder(template));
        return template;
    }

    public void deleteTemplate(UUID id) {
        legalRepository.deleteTemplate(id);
    }

    // ================= GOOGLE DOC IMPORT / PARSER =================

    public GoogleDocImportResponse importDocument(GoogleDocImportRequest req) {
        String content = "";
        String title = "Imported Contract Template";

        if (req.getRawText() != null && !req.getRawText().isBlank()) {
            content = req.getRawText().trim();
        } else if (req.getUrl() != null && !req.getUrl().isBlank()) {
            // Attempt 1: Try authenticated Google Docs + Drive API
            ImportResult result = null;
            String docId = extractDocId(req.getUrl());
            if (docId != null) {
                result = fetchGoogleDocViaApi(docId);
            }
            // Attempt 2: Fallback to public HTTP export
            if (result == null) {
                result = fetchGoogleDoc(req.getUrl());
            }

            content = result.content;
            if (result.title != null && !result.title.isBlank()) {
                title = result.title;
            } else {
                title = extractTitleFromUrl(req.getUrl());
            }
        }

        List<String> detected = detectFieldKeys(content);
        return new GoogleDocImportResponse(title, content, detected);
    }

    public String extractDocId(String urlOrId) {
        if (urlOrId == null || urlOrId.isBlank()) return null;
        String trimmed = urlOrId.trim();
        Matcher m = DOC_ID_PATTERN.matcher(trimmed);
        if (m.find()) {
            return m.group(1);
        }
        if (trimmed.matches("^[a-zA-Z0-9_-]{15,}$")) {
            return trimmed;
        }
        return null;
    }

    private ImportResult fetchGoogleDocViaApi(String docId) {
        Docs docsService = getDocsService();
        Drive driveService = getDriveService();
        if (docsService == null || driveService == null) {
            return null;
        }

        try {
            Document doc = docsService.documents().get(docId).execute();
            String docTitle = doc.getTitle();

            // Export rich HTML from Drive API
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            driveService.files().export(docId, "text/html").executeMediaAndDownloadTo(baos);
            String htmlContent = baos.toString(StandardCharsets.UTF_8);

            // Also extract raw structural text to ensure all {{KEYS}} and [KEYS] are detected
            StringBuilder sb = new StringBuilder();
            if (doc.getBody() != null && doc.getBody().getContent() != null) {
                extractTextFromElements(doc.getBody().getContent(), sb);
            }

            ImportResult cleaned = processImportedHtml(htmlContent);
            return new ImportResult(docTitle != null && !docTitle.isBlank() ? docTitle : cleaned.title, cleaned.content);
        } catch (Exception e) {
            log.warn("Google Docs API import failed for docId {}: {}, falling back to HTTP export", docId, e.getMessage());
            return null;
        }
    }

    private void extractTextFromElements(List<StructuralElement> elements, StringBuilder sb) {
        if (elements == null) return;
        for (StructuralElement elem : elements) {
            if (elem.getParagraph() != null && elem.getParagraph().getElements() != null) {
                for (ParagraphElement pe : elem.getParagraph().getElements()) {
                    if (pe.getTextRun() != null && pe.getTextRun().getContent() != null) {
                        sb.append(pe.getTextRun().getContent());
                    }
                }
            } else if (elem.getTable() != null && elem.getTable().getTableRows() != null) {
                for (TableRow row : elem.getTable().getTableRows()) {
                    if (row.getTableCells() != null) {
                        for (TableCell cell : row.getTableCells()) {
                            extractTextFromElements(cell.getContent(), sb);
                        }
                    }
                }
            }
        }
    }

    public List<String> detectFieldKeys(String content) {
        Set<String> keys = new LinkedHashSet<>();
        if (content == null || content.isBlank()) return new ArrayList<>();

        // 1. Detect standard {{FIELD_NAME}}
        Matcher m1 = PLACEHOLDER_PATTERN.matcher(content);
        while (m1.find()) {
            String key = m1.group(1).trim().toUpperCase().replaceAll("\\s+", "_");
            if (!key.isBlank()) keys.add(key);
        }

        // 2. Detect [FIELD_NAME]
        Matcher m2 = BRACKET_PATTERN.matcher(content);
        while (m2.find()) {
            String key = m2.group(1).trim().toUpperCase().replaceAll("\\s+", "_");
            if (!key.isBlank()) keys.add(key);
        }

        return new ArrayList<>(keys);
    }

    private static class ImportResult {
        String title;
        String content;
        ImportResult(String title, String content) {
            this.title = title;
            this.content = content;
        }
    }

    private ImportResult fetchGoogleDoc(String docUrl) {
        String docId = extractDocId(docUrl);
        if (docId == null) {
            throw new IllegalArgumentException("Invalid Google Docs URL format. Expected: /d/{DOCUMENT_ID}");
        }

        // Attempt 1: Fetch formatted HTML / ZIP export (preserves bold, font, tables, logos, images)
        try {
            String htmlExportUrl = "https://docs.google.com/document/d/" + docId + "/export?format=html";
            HttpURLConnection conn = (HttpURLConnection) new URL(htmlExportUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setInstanceFollowRedirects(true);

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                String contentType = conn.getContentType();
                if (contentType != null && (contentType.contains("zip") || contentType.contains("octet-stream"))) {
                    return parseGoogleDocZip(conn.getInputStream());
                } else {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line).append("\n");
                        }
                        String html = sb.toString().trim();
                        return processImportedHtml(html);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Google Docs HTML export failed, falling back to TXT: {}", e.getMessage());
        }

        // Attempt 2: Fallback to UTF-8 TXT export
        try {
            String txtExportUrl = "https://docs.google.com/document/d/" + docId + "/export?format=txt";
            HttpURLConnection conn = (HttpURLConnection) new URL(txtExportUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(10000);
            conn.setInstanceFollowRedirects(true);

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                    return new ImportResult("Contract Template (" + LocalDate.now().getYear() + ")", sb.toString().trim());
                }
            } else {
                throw new RuntimeException("Could not fetch document. Please ensure Google Doc is shared with service account or viewable (HTTP " + code + ").");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Google Doc: {}", e.getMessage());
            throw new RuntimeException("Google Doc fetch failed: " + e.getMessage());
        }
    }

    private ImportResult parseGoogleDocZip(InputStream is) {
        String htmlContent = null;
        Map<String, String> imageBase64Map = new HashMap<>();

        try (ZipInputStream zis = new ZipInputStream(is)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String entryName = entry.getName();
                if (entryName.endsWith(".html") || entryName.endsWith(".htm")) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buf = new byte[4096];
                    int len;
                    while ((len = zis.read(buf)) > 0) {
                        baos.write(buf, 0, len);
                    }
                    htmlContent = baos.toString(StandardCharsets.UTF_8);
                } else if (entryName.matches(".*\\.(png|jpg|jpeg|gif|svg|webp)$")) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buf = new byte[4096];
                    int len;
                    while ((len = zis.read(buf)) > 0) {
                        baos.write(buf, 0, len);
                    }
                    byte[] imgBytes = baos.toByteArray();
                    String mime = getMimeType(entryName);
                    String b64 = "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(imgBytes);
                    imageBase64Map.put(entryName, b64);
                    if (entryName.contains("/")) {
                        String simple = entryName.substring(entryName.lastIndexOf('/') + 1);
                        imageBase64Map.put(simple, b64);
                    }
                }
                zis.closeEntry();
            }
        } catch (Exception e) {
            log.warn("Error reading Google Doc ZIP: {}", e.getMessage());
        }

        if (htmlContent == null || htmlContent.isBlank()) {
            throw new RuntimeException("No HTML content found in Google Doc export.");
        }

        // Replace relative image URLs with inline base64 Data URIs to preserve logos and graphics
        for (Map.Entry<String, String> img : imageBase64Map.entrySet()) {
            htmlContent = htmlContent.replace("src=\"" + img.getKey() + "\"", "src=\"" + img.getValue() + "\"");
            htmlContent = htmlContent.replace("src='" + img.getKey() + "'", "src='" + img.getValue() + "'");
        }

        return processImportedHtml(htmlContent);
    }

    private ImportResult processImportedHtml(String html) {
        String docTitle = null;
        Matcher tm = TITLE_TAG_PATTERN.matcher(html);
        if (tm.find()) {
            docTitle = tm.group(1).trim();
        }

        String cleaned = html;

        // 1. Remove script tags and comments
        cleaned = cleaned.replaceAll("(?is)<script[^>]*>.*?</script>", "");
        cleaned = cleaned.replaceAll("(?is)<!--.*?-->", "");

        // 2. Clean up HTML tags accidentally nested inside {{...}} or [...] placeholders
        for (int i = 0; i < 5; i++) {
            cleaned = cleaned.replaceAll("(\\{\\{[^{}]*?)<[^>]+>([^{}]*?\\}\\})", "$1$2");
            cleaned = cleaned.replaceAll("(\\[[^\\[\\]]*?)<[^>]+>([^\\[\\]]*?\\])", "$1$2");
        }

        // 3. Normalize Google redirect links
        cleaned = cleaned.replaceAll("https://www\\.google\\.com/url\\?q=([^&\"'>]+)(&amp;[^\"'>]*)?", "$1");

        return new ImportResult(docTitle != null ? cleanGeneratedDocumentTitle(docTitle) : "Contract Template", cleaned);
    }

    private String getMimeType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/png";
    }

    private String extractTitleFromUrl(String url) {
        return "Contract Template (" + LocalDate.now().getYear() + ")";
    }

    // ================= CONTRACT GENERATION (GOOGLE DOCS API + FALLBACK) =================

    public String findDriveFileByContract(Drive drive, String contractNumber, String templateDocId) {
        if (drive == null || contractNumber == null || contractNumber.isBlank()) return null;
        try {
            String q = "trashed = false and mimeType = 'application/vnd.google-apps.document' and name contains '" + contractNumber.replace("'", "\\'") + "'";
            FileList list = drive.files().list()
                    .setQ(q)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setFields("files(id, name)")
                    .setPageSize(5)
                    .execute();
            if (list.getFiles() != null) {
                for (File f : list.getFiles()) {
                    if (templateDocId != null && f.getId().equals(templateDocId)) {
                        continue;
                    }
                    if (f.getName() != null && f.getName().contains(contractNumber)) {
                        return f.getId();
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Drive search for contract file failed: {}", e.getMessage());
        }
        return null;
    }

    public List<GeneratedContract> getAllContracts() {
        List<GeneratedContract> contracts = legalRepository.findAllContracts();
        Drive drive = getDriveService();
        if (drive != null) {
            boolean anyHealed = false;
            for (GeneratedContract c : contracts) {
                String templateDocId = null;
                if (c.getTemplateId() != null) {
                    ContractTemplate t = legalRepository.findTemplateById(c.getTemplateId()).orElse(null);
                    if (t != null && t.getGoogleDocsUrl() != null) {
                        templateDocId = extractDocId(t.getGoogleDocsUrl());
                    }
                }
                if (c.getDriveFileId() == null || c.getDriveFileId().isBlank() || (templateDocId != null && templateDocId.equals(c.getDriveFileId()))) {
                    String foundId = findDriveFileByContract(drive, c.getContractNumber(), templateDocId);
                    if (foundId != null && !foundId.isBlank() && !foundId.equals(templateDocId)) {
                        c.setDriveFileId(foundId);
                        legalRepository.updateContract(c);
                        anyHealed = true;
                    } else if (templateDocId != null && templateDocId.equals(c.getDriveFileId())) {
                        c.setDriveFileId(null);
                        legalRepository.updateContract(c);
                        anyHealed = true;
                    }
                }
            }
            if (anyHealed) {
                log.info("Auto-healed Google Drive file IDs for legal contracts.");
            }
        }
        return contracts;
    }

    public GeneratedContract getContractById(UUID id) {
        GeneratedContract contract = legalRepository.findContractById(id).orElse(null);
        if (contract != null) {
            String templateDocId = null;
            if (contract.getTemplateId() != null) {
                ContractTemplate t = legalRepository.findTemplateById(contract.getTemplateId()).orElse(null);
                if (t != null && t.getGoogleDocsUrl() != null) {
                    templateDocId = extractDocId(t.getGoogleDocsUrl());
                }
            }
            if (contract.getDriveFileId() == null || contract.getDriveFileId().isBlank() || (templateDocId != null && templateDocId.equals(contract.getDriveFileId()))) {
                Drive drive = getDriveService();
                if (drive != null) {
                    String foundId = findDriveFileByContract(drive, contract.getContractNumber(), templateDocId);
                    if (foundId != null && !foundId.isBlank() && !foundId.equals(templateDocId)) {
                        contract.setDriveFileId(foundId);
                        legalRepository.updateContract(contract);
                    } else if (templateDocId != null && templateDocId.equals(contract.getDriveFileId())) {
                        contract.setDriveFileId(null);
                        legalRepository.updateContract(contract);
                    }
                }
            }
        }
        return contract;
    }

    public byte[] getContractPdfBytes(UUID contractId) {
        GeneratedContract contract = getContractById(contractId);
        if (contract == null) return null;

        if (contract.getPdfData() != null && !contract.getPdfData().isBlank()) {
            String data = contract.getPdfData();
            if (data.startsWith("data:application/pdf;base64,")) {
                data = data.substring("data:application/pdf;base64,".length());
            }
            try {
                return Base64.getDecoder().decode(data);
            } catch (Exception ignored) {}
        }

        String fileId = contract.getDriveFileId();
        Drive drive = getDriveService();
        if (drive != null) {
            if (fileId == null || fileId.isBlank()) {
                fileId = findDriveFileByContract(drive, contract.getContractNumber(), contract.getTitle());
                if (fileId != null) {
                    contract.setDriveFileId(fileId);
                    legalRepository.updateContract(contract);
                }
            }
            if (fileId != null && !fileId.isBlank()) {
                try {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    drive.files().export(fileId, "application/pdf").executeMediaAndDownloadTo(baos);
                    return baos.toByteArray();
                } catch (Exception e) {
                    log.warn("On-demand PDF export failed for doc {}: {}", fileId, e.getMessage());
                }
            }
        }
        return null;
    }

    private String formatToEuropeanDate(String val) {
        if (val == null || val.isBlank()) return val;
        String trimmed = val.trim();
        if (trimmed.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            try {
                LocalDate parsed = LocalDate.parse(trimmed, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                return parsed.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } catch (Exception ignored) {}
        }
        if (trimmed.matches("^\\d{4}-\\d{2}-\\d{2}T.*")) {
            try {
                LocalDate parsed = LocalDate.parse(trimmed.substring(0, 10), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                return parsed.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } catch (Exception ignored) {}
        }
        if (trimmed.matches("^\\d{4}/\\d{2}/\\d{2}$")) {
            try {
                LocalDate parsed = LocalDate.parse(trimmed, DateTimeFormatter.ofPattern("yyyy/MM/dd"));
                return parsed.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } catch (Exception ignored) {}
        }
        return val;
    }

    public static String cleanGeneratedDocumentTitle(String title) {
        if (title == null) return "Document";
        String cleaned = title.trim();
        cleaned = cleaned.replaceAll("(?i)^(template|șablon|sablon)\\s*[-:_–—]?\\s*", "");
        return cleaned.isBlank() ? "Document" : cleaned.trim();
    }

    public String resolveDocumentIdentifier(String patternOrExplicit, String templateTitle, Map<String, Object> fields) {
        String pattern = patternOrExplicit != null && !patternOrExplicit.isBlank() 
                ? patternOrExplicit.trim() 
                : "{{TEMPLATE}}_{{DATA}}_{{#}}";

        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
        if (fields.containsKey("DATA_CONTRACT") && fields.get("DATA_CONTRACT") != null) {
            dateStr = formatToEuropeanDate(String.valueOf(fields.get("DATA_CONTRACT")));
        } else if (fields.containsKey("DATA_DOCUMENT") && fields.get("DATA_DOCUMENT") != null) {
            dateStr = formatToEuropeanDate(String.valueOf(fields.get("DATA_DOCUMENT")));
        } else if (fields.containsKey("DATA") && fields.get("DATA") != null) {
            dateStr = formatToEuropeanDate(String.valueOf(fields.get("DATA")));
        } else if (fields.containsKey("DATE") && fields.get("DATE") != null) {
            dateStr = formatToEuropeanDate(String.valueOf(fields.get("DATE")));
        }

        String safeTemplateTitle = sanitizeIdentifierPart(cleanGeneratedDocumentTitle(templateTitle != null && !templateTitle.isBlank() ? templateTitle : "Document"));
        String currentYear = String.valueOf(LocalDate.now().getYear());

        // 1. Replace braced and bracketed variables: {{KEY}}, {KEY}, [KEY]
        String resolved = pattern;
        
        // Standard meta variables
        resolved = replaceCaseInsensitive(resolved, "{{TEMPLATE}}", safeTemplateTitle);
        resolved = replaceCaseInsensitive(resolved, "{TEMPLATE}", safeTemplateTitle);
        resolved = replaceCaseInsensitive(resolved, "[TEMPLATE]", safeTemplateTitle);
        resolved = replaceCaseInsensitive(resolved, "{{TITLE}}", safeTemplateTitle);
        resolved = replaceCaseInsensitive(resolved, "{TITLE}", safeTemplateTitle);
        resolved = replaceCaseInsensitive(resolved, "[TITLE]", safeTemplateTitle);

        resolved = replaceCaseInsensitive(resolved, "{{DATA}}", dateStr);
        resolved = replaceCaseInsensitive(resolved, "{DATA}", dateStr);
        resolved = replaceCaseInsensitive(resolved, "[DATA]", dateStr);
        resolved = replaceCaseInsensitive(resolved, "{{DATE}}", dateStr);
        resolved = replaceCaseInsensitive(resolved, "{DATE}", dateStr);
        resolved = replaceCaseInsensitive(resolved, "[DATE]", dateStr);

        resolved = replaceCaseInsensitive(resolved, "{{YEAR}}", currentYear);
        resolved = replaceCaseInsensitive(resolved, "{YEAR}", currentYear);
        resolved = replaceCaseInsensitive(resolved, "[YEAR]", currentYear);

        // Replace field variables from fields map
        for (Map.Entry<String, Object> entry : fields.entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue() != null ? sanitizeIdentifierPart(String.valueOf(entry.getValue())) : "";
            resolved = replaceCaseInsensitive(resolved, "{{" + key + "}}", val);
            resolved = replaceCaseInsensitive(resolved, "{" + key + "}", val);
            resolved = replaceCaseInsensitive(resolved, "[" + key + "]", val);
        }

        // 2. Also handle unbraced tokens like DATE_SPONSOR_NAME_# or TEMPLATE_DATE_SPONSOR_NAME
        if (resolved.contains("TEMPLATE") || resolved.contains("TITLE") || resolved.contains("DATE") || resolved.contains("DATA") || resolved.contains("YEAR")) {
            resolved = resolved.replaceAll("(?i)\\bTEMPLATE\\b", safeTemplateTitle);
            resolved = resolved.replaceAll("(?i)\\bTITLE\\b", safeTemplateTitle);
            resolved = resolved.replaceAll("(?i)\\bDATA\\b", Matcher.quoteReplacement(dateStr));
            resolved = resolved.replaceAll("(?i)\\bDATE\\b", Matcher.quoteReplacement(dateStr));
            resolved = resolved.replaceAll("(?i)\\bYEAR\\b", currentYear);
        }
        for (Map.Entry<String, Object> entry : fields.entrySet()) {
            String key = entry.getKey();
            if (resolved.toUpperCase().contains(key.toUpperCase())) {
                String val = entry.getValue() != null ? sanitizeIdentifierPart(String.valueOf(entry.getValue())) : "";
                resolved = resolved.replaceAll("(?i)\\b" + Pattern.quote(key) + "\\b", Matcher.quoteReplacement(val));
            }
        }

        // Clean double underscores or trailing separators before resolving '#'
        boolean hasHash = resolved.contains("{{#}}") || resolved.contains("{#}") || resolved.contains("[#]") || resolved.contains("#");
        if (hasHash) {
            resolved = resolved.replace("{{#}}", "#").replace("{#}", "#").replace("[#]", "#");
            int hashIndex = resolved.indexOf('#');
            String prefix = resolved.substring(0, hashIndex);
            String suffix = resolved.substring(hashIndex + 1);

            List<String> existing = legalRepository.findExistingContractNumbersLike(prefix + "%");
            int maxSeq = 0;
            Pattern seqPattern = Pattern.compile("^" + Pattern.quote(prefix) + "(\\d+)" + Pattern.quote(suffix) + "$", Pattern.CASE_INSENSITIVE);
            for (String exist : existing) {
                Matcher m = seqPattern.matcher(exist);
                if (m.matches()) {
                    try {
                        int num = Integer.parseInt(m.group(1));
                        if (num > maxSeq) maxSeq = num;
                    } catch (Exception ignored) {}
                }
            }
            int nextSeq = maxSeq + 1;
            resolved = prefix + nextSeq + suffix;
        } else {
            // If no '#' token was provided, check if the exact identifier exists in DB to prevent collision
            if (legalRepository.existsContractNumber(resolved)) {
                int nextSeq = 2;
                while (legalRepository.existsContractNumber(resolved + "_" + nextSeq)) {
                    nextSeq++;
                }
                resolved = resolved + "_" + nextSeq;
            }
        }

        resolved = resolved.replaceAll("[\\s]+", "_").replaceAll("_+", "_").trim();
        return resolved;
    }

    private String sanitizeIdentifierPart(String str) {
        if (str == null) return "";
        return str.trim()
                .replaceAll("[\\\\/:*?\"<>|#]+", "")
                .replaceAll("\\s+", "_");
    }

    private String replaceCaseInsensitive(String source, String target, String replacement) {
        if (source == null || target == null || replacement == null) return source;
        return Pattern.compile(Pattern.quote(target), Pattern.CASE_INSENSITIVE)
                .matcher(source)
                .replaceAll(Matcher.quoteReplacement(replacement));
    }

    public GeneratedContract generateContract(GenerateContractRequest req, String userEmail) {
        ContractTemplate template = null;
        String templateGoogleDocUrl = null;

        if (req.getTemplateId() != null) {
            template = legalRepository.findTemplateById(req.getTemplateId()).orElse(null);
            if (template != null) {
                templateGoogleDocUrl = template.getGoogleDocsUrl();
            }
        }

        String rawTitle = req.getTitle() != null && !req.getTitle().isBlank() 
                ? req.getTitle() 
                : (template != null ? template.getTitle() : "Document");
        String contractTitle = cleanGeneratedDocumentTitle(rawTitle);

        String partyA = req.getPartyAName() != null ? req.getPartyAName() : "";
        String partyB = req.getPartyBName() != null ? req.getPartyBName() : "";

        // Merge standard field values
        Map<String, Object> mergedFields = new LinkedHashMap<>();
        if (req.getFieldValues() != null) {
            for (Map.Entry<String, Object> entry : req.getFieldValues().entrySet()) {
                if (entry.getValue() instanceof String strVal) {
                    mergedFields.put(entry.getKey(), formatToEuropeanDate(strVal));
                } else {
                    mergedFields.put(entry.getKey(), entry.getValue());
                }
            }
        }

        String defaultDate = LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
        Object dataContract = mergedFields.get("DATA_CONTRACT");
        mergedFields.put("DATA_CONTRACT", dataContract != null && !String.valueOf(dataContract).isBlank()
                ? formatToEuropeanDate(String.valueOf(dataContract))
                : defaultDate);

        Object dataDocument = mergedFields.get("DATA_DOCUMENT");
        mergedFields.put("DATA_DOCUMENT", dataDocument != null && !String.valueOf(dataDocument).isBlank()
                ? formatToEuropeanDate(String.valueOf(dataDocument))
                : defaultDate);

        Object dataGen = mergedFields.get("DATA_GENERARE");
        mergedFields.put("DATA_GENERARE", dataGen != null && !String.valueOf(dataGen).isBlank()
                ? formatToEuropeanDate(String.valueOf(dataGen))
                : defaultDate);

        mergedFields.putIfAbsent("DATA", defaultDate);
        mergedFields.putIfAbsent("DATE", defaultDate);
        mergedFields.putIfAbsent("DATA_AZI", defaultDate);
        mergedFields.putIfAbsent("CURRENT_DATE", defaultDate);
        mergedFields.putIfAbsent("DATA_EMITERII", defaultDate);
        mergedFields.putIfAbsent("DATA_SEMNARII", defaultDate);

        if (!partyA.isBlank()) mergedFields.put("PARTY_A", partyA);
        if (!partyB.isBlank()) mergedFields.put("PARTY_B", partyB);

        // Document identifier strictly driven by template configuration
        String patternToUse = (template != null && template.getIdentifierPattern() != null && !template.getIdentifierPattern().isBlank())
                ? template.getIdentifierPattern()
                : "{{TEMPLATE}}_{{DATA}}_{{#}}";

        String contractNum = resolveDocumentIdentifier(patternToUse, contractTitle, mergedFields);

        mergedFields.put("CONTRACT_NUMBER", contractNum);
        mergedFields.put("NUMAR_CONTRACT", contractNum);
        mergedFields.put("NUMAR_DOCUMENT", contractNum);
        mergedFields.put("DOCUMENT_NUMBER", contractNum);
        mergedFields.put("IDENTIFICATOR_DOCUMENT", contractNum);
        mergedFields.put("DOCUMENT_IDENTIFIER", contractNum);

        // Document Generation - Direct Google Drive Export
        String templateDocId = extractDocId(templateGoogleDocUrl);
        if (templateDocId == null) {
            throw new IllegalArgumentException("Șablonul '" + contractTitle + "' nu conține un link Google Docs valid.");
        }

        GoogleContractGenerationResult googleRes = null;
        try {
            String appsScriptUrl = getAppsScriptUrl();
            if (appsScriptUrl != null && !appsScriptUrl.isBlank()) {
                try {
                    googleRes = generateViaAppsScript(templateDocId, contractTitle, contractNum, mergedFields);
                } catch (Exception e) {
                    log.warn("Apps Script generation failed for {}: {}. Falling back to Google Docs & Drive API...", contractNum, e.getMessage());
                }
            }
            if (googleRes == null || googleRes.driveFileId == null || googleRes.driveFileId.isBlank()) {
                googleRes = generateViaGoogleDocsApi(templateDocId, contractTitle, contractNum, mergedFields, userEmail);
            }
            if (googleRes == null || googleRes.driveFileId == null || googleRes.driveFileId.isBlank()) {
                throw new IllegalStateException("Google Docs / Drive service is not initialized or credentials are missing.");
            }
            log.info("Successfully generated document {} on Google Drive copy ID: {}", contractNum, googleRes.driveFileId);
        } catch (Exception e) {
            log.error("Generation failed for document {}: {}", contractNum, e.getMessage(), e);
            throw new RuntimeException("Eroare generare Google: " + e.getMessage(), e);
        }

        GeneratedContract contract = new GeneratedContract();
        contract.setId(UUID.randomUUID());
        contract.setTemplateId(req.getTemplateId());
        contract.setContractNumber(contractNum);
        contract.setTitle(contractTitle);
        contract.setStatus(req.getStatus() != null ? req.getStatus() : "draft");
        contract.setPartyAName(partyA);
        contract.setPartyBName(partyB);
        contract.setPartyBEmail(req.getPartyBEmail());
        contract.setFieldValues(gson.toJson(mergedFields));
        contract.setRenderedContent("");
        contract.setPdfData(null);
        contract.setDriveFileId(googleRes.driveFileId);
        contract.setValidFrom(req.getValidFrom());
        contract.setValidUntil(req.getValidUntil());
        contract.setNotes(req.getNotes());
        contract.setCreatedBy(userEmail);

        GeneratedContract saved = legalRepository.saveContract(contract);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Legal", "generateContract"));
        return saved;
    }

    private GoogleContractGenerationResult generateViaAppsScript(
            String templateDocId,
            String contractTitle,
            String contractNum,
            Map<String, Object> fieldValues) throws Exception {

        String scriptUrl = getAppsScriptUrl();
        if (scriptUrl == null || scriptUrl.isBlank()) {
            throw new IllegalStateException("GOOGLE_APPS_SCRIPT_URL nu este configurat.");
        }

        String parentFolderId = getGoogleDriveFolderId(templateDocId, null);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("secret", getAppsScriptSecret());
        payload.put("templateDocId", templateDocId);
        payload.put("contractTitle", contractTitle);
        payload.put("contractNum", contractNum);
        payload.put("fields", fieldValues);
        if (parentFolderId != null && !parentFolderId.isBlank()) {
            payload.put("folderId", parentFolderId);
            payload.put("targetFolderId", parentFolderId);
            payload.put("parentFolderId", parentFolderId);
        }

        String jsonPayload = gson.toJson(payload);

        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(scriptUrl))
                .header("Content-Type", "application/json; charset=UTF-8")
                .timeout(java.time.Duration.ofSeconds(30))
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                .build();

        java.net.http.HttpResponse<String> response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        if (response.statusCode() != 200) {
            throw new RuntimeException("Apps Script returned HTTP " + response.statusCode() + ": " + response.body());
        }

        Map<?, ?> resMap = gson.fromJson(response.body(), Map.class);
        if (resMap == null) {
            throw new RuntimeException("Empty response from Google Apps Script.");
        }

        if (Boolean.TRUE.equals(resMap.get("error")) || (resMap.containsKey("status") && "error".equalsIgnoreCase(String.valueOf(resMap.get("status"))))) {
            throw new RuntimeException("Apps Script error: " + resMap.get("errorMessage"));
        }

        String driveFileId = null;
        if (resMap.get("driveFileId") != null) driveFileId = String.valueOf(resMap.get("driveFileId"));
        else if (resMap.get("docId") != null) driveFileId = String.valueOf(resMap.get("docId"));
        else if (resMap.get("id") != null) driveFileId = String.valueOf(resMap.get("id"));
        else if (resMap.get("documentId") != null) driveFileId = String.valueOf(resMap.get("documentId"));
        else if (resMap.get("fileId") != null) driveFileId = String.valueOf(resMap.get("fileId"));
        else if (resMap.get("url") != null) driveFileId = extractDocId(String.valueOf(resMap.get("url")));
        else if (resMap.get("docUrl") != null) driveFileId = extractDocId(String.valueOf(resMap.get("docUrl")));
        else if (resMap.get("fileUrl") != null) driveFileId = extractDocId(String.valueOf(resMap.get("fileUrl")));
        else if (resMap.get("webViewLink") != null) driveFileId = extractDocId(String.valueOf(resMap.get("webViewLink")));
        else if (resMap.get("link") != null) driveFileId = extractDocId(String.valueOf(resMap.get("link")));
        else if (resMap.get("editUrl") != null) driveFileId = extractDocId(String.valueOf(resMap.get("editUrl")));
        else if (resMap.get("documentUrl") != null) driveFileId = extractDocId(String.valueOf(resMap.get("documentUrl")));

        if (driveFileId != null) {
            String extracted = extractDocId(driveFileId);
            if (extracted != null) driveFileId = extracted;
        }

        if (driveFileId == null || driveFileId.isBlank() || driveFileId.equalsIgnoreCase(templateDocId)) {
            throw new IllegalStateException("Google Apps Script did not create a new document copy (got: " + response.body() + ")");
        }

        return new GoogleContractGenerationResult(driveFileId);
    }

    private static class GoogleContractGenerationResult {
        String driveFileId;
        GoogleContractGenerationResult(String driveFileId) {
            this.driveFileId = driveFileId;
        }
    }

    public String getGoogleDriveFolderId(String templateDocId, Drive driveService) {
        // 1. Check if organized Legal / Generated Contracts folder exists
        if (googleDriveService != null) {
            try {
                String legalFolderId = googleDriveService.getLegalGeneratedDocsFolderId();
                if (legalFolderId != null && !legalFolderId.isBlank()) {
                    return legalFolderId;
                }
            } catch (Exception e) {
                log.debug("Could not resolve Legal Generated Docs folder from sync service: {}", e.getMessage());
            }
        }

        String folderId = null;
        // 2. Auto-discover parent folder of template doc
        if (driveService != null && templateDocId != null) {
            try {
                File tFile = driveService.files().get(templateDocId)
                        .setSupportsAllDrives(true)
                        .setFields("id, name, parents, owners")
                        .execute();
                if (tFile.getParents() != null && !tFile.getParents().isEmpty()) {
                    folderId = tFile.getParents().get(0);
                    log.info("Discovered template parent folder: {}", folderId);
                }
            } catch (Exception e) {
                log.warn("Could not determine template parent folder: {}", e.getMessage());
            }
        }
        // 3. Fallbacks
        if (isBlank(folderId) && properties != null && properties.getGoogle() != null && properties.getGoogle().getDrive() != null) {
            folderId = properties.getGoogle().getDrive().getFolderId();
        }
        if (isBlank(folderId)) folderId = System.getenv("GOOGLE_DRIVE_FOLDER_ID");
        if (isBlank(folderId)) {
            String[] envFiles = new String[] { ".env", "backend/.env", "../.env" };
            for (String envPath : envFiles) {
                String envContent = tryReadFile(envPath);
                if (envContent != null) {
                    String extracted = extractFromEnv(envContent, "GOOGLE_DRIVE_FOLDER_ID");
                    if (extracted != null && !extracted.isBlank()) {
                        folderId = extracted.trim();
                        break;
                    }
                }
            }
        }
        return isBlank(folderId) ? null : folderId.trim();
    }

    private GoogleContractGenerationResult generateViaGoogleDocsApi(
            String templateDocId, 
            String contractTitle, 
            String contractNum, 
            Map<String, Object> fieldValues,
            String userEmail) throws Exception {

        Drive driveService = getDriveService();
        if (driveService == null) {
            throw new IllegalStateException("Google Drive service is not initialized or credentials are missing.");
        }
        Docs docsService = getDocsService();

        // 1. Get the target Legal / Generated_Documents folder
        String parentFolderId = getGoogleDriveFolderId(templateDocId, driveService);

        // 2. Make a copy of the template Google Doc directly in the Generated Documents folder
        File copyMetadata = new File();
        copyMetadata.setName(contractTitle + " - " + contractNum);
        if (parentFolderId != null && !parentFolderId.isBlank()) {
            copyMetadata.setParents(Collections.singletonList(parentFolderId));
        }

        File copiedFile;
        try {
            copiedFile = driveService.files().copy(templateDocId, copyMetadata)
                    .setSupportsAllDrives(true)
                    .setFields("id, name, parents, webViewLink")
                    .execute();
            log.info("Directly copied file into parent folder: {}", parentFolderId);
        } catch (Exception e) {
            log.warn("Direct copy with parents [{}] failed ({}), trying copy without parents...", parentFolderId, e.getMessage());
            copyMetadata.setParents(null);
            copiedFile = driveService.files().copy(templateDocId, copyMetadata)
                    .setSupportsAllDrives(true)
                    .setFields("id, name, parents, webViewLink")
                    .execute();

            if (parentFolderId != null && !parentFolderId.isBlank()) {
                try {
                    driveService.files().update(copiedFile.getId(), null)
                            .setAddParents(parentFolderId)
                            .setSupportsAllDrives(true)
                            .execute();
                    log.info("Successfully moved copied file {} to parent folder {}", copiedFile.getId(), parentFolderId);
                } catch (Exception ex) {
                    log.warn("Could not add parent folder {} to file {}: {}", parentFolderId, copiedFile.getId(), ex.getMessage());
                }
            }
        }

        String newDocId = copiedFile.getId();

        // 3. Batch update the new document to replace all {{KEY}} variables directly in Google Docs
        if (docsService != null) {
            List<Request> requests = new ArrayList<>();
            for (Map.Entry<String, Object> entry : fieldValues.entrySet()) {
                String key = entry.getKey();
                String val = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
                
                requests.add(new Request().setReplaceAllText(new ReplaceAllTextRequest()
                        .setContainsText(new SubstringMatchCriteria().setMatchCase(false).setText("{{" + key + "}}"))
                        .setReplaceText(val)));
                requests.add(new Request().setReplaceAllText(new ReplaceAllTextRequest()
                        .setContainsText(new SubstringMatchCriteria().setMatchCase(false).setText("{{ " + key + " }}"))
                        .setReplaceText(val)));
                requests.add(new Request().setReplaceAllText(new ReplaceAllTextRequest()
                        .setContainsText(new SubstringMatchCriteria().setMatchCase(false).setText("[" + key + "]"))
                        .setReplaceText(val)));
            }
            if (!requests.isEmpty()) {
                try {
                    docsService.documents().batchUpdate(newDocId, new BatchUpdateDocumentRequest().setRequests(requests))
                            .execute();
                } catch (Exception e) {
                    log.warn("Docs API batch update failed on new copy {}: {}", newDocId, e.getMessage());
                }
            }
        }

        // 4. Background non-blocking permissions assignment
        CompletableFuture.runAsync(() -> {
            try {
                if (userEmail != null && userEmail.contains("@") && !userEmail.contains("placeholder")) {
                    try {
                        com.google.api.services.drive.model.Permission userPerm = new com.google.api.services.drive.model.Permission()
                                .setType("user")
                                .setRole("writer")
                                .setEmailAddress(userEmail.trim());
                        driveService.permissions().create(newDocId, userPerm)
                                .setSupportsAllDrives(true)
                                .setSendNotificationEmail(false)
                                .execute();
                    } catch (Exception ignored) {}
                }

                try {
                    com.google.api.services.drive.model.Permission permission = new com.google.api.services.drive.model.Permission()
                            .setType("anyone")
                            .setRole("writer")
                            .setAllowFileDiscovery(false);
                    driveService.permissions().create(newDocId, permission)
                            .setSupportsAllDrives(true)
                            .execute();
                } catch (Exception e) {
                    try {
                        com.google.api.services.drive.model.Permission readerPerm = new com.google.api.services.drive.model.Permission()
                                .setType("anyone")
                                .setRole("reader")
                                .setAllowFileDiscovery(false);
                        driveService.permissions().create(newDocId, readerPerm)
                                .setSupportsAllDrives(true)
                                .execute();
                    } catch (Exception ignored) {}
                }
            } catch (Exception ex) {
                log.debug("Async permission grant completed: {}", ex.getMessage());
            }
        });

        return new GoogleContractGenerationResult(newDocId);
    }

    public GeneratedContract updateContract(UUID id, GeneratedContract patch) {
        GeneratedContract existing = legalRepository.findContractById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found: " + id));
        if (patch.getTitle() != null && !patch.getTitle().isBlank()) existing.setTitle(patch.getTitle());
        if (patch.getStatus() != null && !patch.getStatus().isBlank()) existing.setStatus(patch.getStatus());
        if (patch.getPartyAName() != null) existing.setPartyAName(patch.getPartyAName());
        if (patch.getPartyBName() != null) existing.setPartyBName(patch.getPartyBName());
        if (patch.getPartyBEmail() != null) existing.setPartyBEmail(patch.getPartyBEmail());
        if (patch.getFieldValues() != null && !patch.getFieldValues().isBlank()) existing.setFieldValues(patch.getFieldValues());
        if (patch.getRenderedContent() != null && !patch.getRenderedContent().isBlank()) existing.setRenderedContent(patch.getRenderedContent());
        if (patch.getPdfData() != null && !patch.getPdfData().isBlank()) existing.setPdfData(patch.getPdfData());
        if (patch.getDriveFileId() != null && !patch.getDriveFileId().isBlank()) existing.setDriveFileId(patch.getDriveFileId());
        if (patch.getValidFrom() != null) existing.setValidFrom(patch.getValidFrom());
        if (patch.getValidUntil() != null) existing.setValidUntil(patch.getValidUntil());
        if (patch.getNotes() != null) existing.setNotes(patch.getNotes());

        legalRepository.updateContract(existing);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Legal", "updateContract"));
        return existing;
    }

    public void deleteContract(UUID id) {
        legalRepository.deleteContract(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Legal", "deleteContract"));
    }

    public LegalStatsDTO getStats() {
        return legalRepository.getStats();
    }
}
