package com.charityapp.service.google;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;



import com.charityapp.config.GoogleCredentialFactory;
import com.google.api.services.sheets.v4.SheetsScopes;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.io.InputStream;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.charityapp.dto.finance.ScannedExpenseDto;
import com.charityapp.dto.sync.GoogleDriveFolderDTO;
import com.charityapp.dto.sync.GoogleDriveSubfolderDTO;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.services.drive.model.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;

@org.springframework.stereotype.Service
@SuppressWarnings("deprecation")
public class GoogleDriveService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GoogleDriveService.class);
    
    private final AppSettingsService appSettingsService;
    private final com.charityapp.config.AppConfigProperties properties;
    private final com.charityapp.config.TenantProperties tenantProperties;
    private final GoogleCredentialFactory credentialFactory;

    @org.springframework.beans.factory.annotation.Value("${GOOGLE_DRIVE_FOLDER_ID:}")
    private String googleDriveFolderIdProp;

    private static final java.time.format.DateTimeFormatter DATE_FORMATTER = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final java.util.Map<String, String> folderCache = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, String> domainSpreadsheetCache = new java.util.concurrent.ConcurrentHashMap<>();
    private volatile java.util.List<com.charityapp.dto.sync.GoogleDriveFolderDTO> cachedFolderHierarchy = new java.util.concurrent.CopyOnWriteArrayList<>();

    public GoogleDriveService(AppSettingsService appSettingsService,
                              com.charityapp.config.AppConfigProperties properties,
                              GoogleCredentialFactory credentialFactory) {
        this(appSettingsService, properties, new com.charityapp.config.TenantProperties(), credentialFactory);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleDriveService(AppSettingsService appSettingsService,
                              com.charityapp.config.AppConfigProperties properties,
                              com.charityapp.config.TenantProperties tenantProperties,
                              GoogleCredentialFactory credentialFactory) {
        this.appSettingsService = appSettingsService;
        this.properties = properties;
        this.tenantProperties = tenantProperties != null ? tenantProperties : new com.charityapp.config.TenantProperties();
        this.credentialFactory = credentialFactory;
    }

    private String getRootWorkspaceFolderTitle() {
        return (tenantProperties != null && tenantProperties.getIntegrations() != null && tenantProperties.getIntegrations().getGoogleDriveFolderName() != null)
                ? tenantProperties.getIntegrations().getGoogleDriveFolderName()
                : "Charity Workspace";
    }

    public java.util.List<com.charityapp.dto.sync.GoogleDriveFolderDTO> getCachedFolderHierarchy() {
        return cachedFolderHierarchy;
    }

    public void setCustomFolderId(String folderId, String effectiveSpreadsheetId) {
        String cleanId = folderId != null ? folderId.trim() : "";
        appSettingsService.saveSetting("google_drive_folder_id", cleanId);
        folderCache.clear();
        domainSpreadsheetCache.clear();
        if (cachedFolderHierarchy != null) cachedFolderHierarchy.clear();

        if (cleanId.isEmpty()) return;

        try {
            com.google.api.services.drive.Drive drive = getDriveService();
            if (effectiveSpreadsheetId != null && !effectiveSpreadsheetId.isEmpty()) {
                com.google.api.services.drive.model.File file = drive.files().get(effectiveSpreadsheetId).setFields("parents").execute();
                if (file.getParents() != null) {
                    String previousParents = String.join(",", file.getParents());
                    drive.files().update(effectiveSpreadsheetId, null)
                            .setAddParents(cleanId)
                            .setRemoveParents(previousParents)
                            .setFields("id, parents")
                            .execute();
                }
            }
            ensureDriveFolderHierarchy();
        } catch (Exception e) {
            log.warn("Failed to relocate spreadsheet to new folder", e);
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
    public String getEffectiveFolderId() {
        String dbVal = appSettingsService.getSetting("google_drive_folder_id");
        if (!isBlank(dbVal)) return dbVal.trim();

        if (properties != null && properties.getGoogle() != null && properties.getGoogle().getDrive() != null) {
            String propVal = properties.getGoogle().getDrive().getFolderId();
            if (!isBlank(propVal)) return propVal.trim();
        }

        if (googleDriveFolderIdProp != null && !googleDriveFolderIdProp.isBlank()) {
            return googleDriveFolderIdProp.trim();
        }

        String envVal = System.getenv("GOOGLE_DRIVE_FOLDER_ID");
        if (!isBlank(envVal)) return envVal.trim();

        return null;
    }

    public Drive getDriveService() throws Exception {
        GoogleCredential credential = credentialFactory.createCredential(
                Arrays.asList(SheetsScopes.SPREADSHEETS, DriveScopes.DRIVE, DriveScopes.DRIVE_FILE),
                "drive"
        );

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName(getSpreadsheetPrefix() + " Master Dashboard Sync")
                .build();
    }

    public String getSpreadsheetPrefix() {
        if (tenantProperties != null && tenantProperties.getIntegrations() != null && !isBlank(tenantProperties.getIntegrations().getGoogleSheetsPrefix())) {
            return tenantProperties.getIntegrations().getGoogleSheetsPrefix().trim();
        }
        if (tenantProperties != null && tenantProperties.getIdentity() != null && !isBlank(tenantProperties.getIdentity().getShorthand())) {
            return tenantProperties.getIdentity().getShorthand().trim();
        }
        String prefixEnv = System.getenv("APP_GOOGLE_SHEETS_PREFIX");
        if (!isBlank(prefixEnv)) return prefixEnv.trim();
        String shorthandEnv = System.getenv("APP_TENANT_SHORTHAND");
        if (!isBlank(shorthandEnv)) return shorthandEnv.trim();
        return "CHARITY";
    }

    public static class FolderSpec {
        public final String domain;
        public final String folderName;
        public final String sheetTitle;
        public final List<String> subfolders;

        public FolderSpec(String domain, String folderName, String sheetTitle, List<String> subfolders) {
            this.domain = domain;
            this.folderName = folderName;
            this.sheetTitle = sheetTitle;
            this.subfolders = subfolders;
        }
    }

    public List<FolderSpec> getDomainFolderSpecs() {
        String prefix = getSpreadsheetPrefix();
        return List.of(
                new FolderSpec("Finances", "Finances", prefix + "_Finances", List.of("Receipts_Invoices", "Financial_Reports")),
                new FolderSpec("Legal", "Legal", prefix + "_Legal", List.of("Generated_Documents", "Templates")),
                new FolderSpec("Logistics", "Logistics", prefix + "_Logistics", List.of("EoD_Stand_Reports", "Stock_Transfers_Inventory")),
                new FolderSpec("HR", "HR_Volunteers", prefix + "_HR_Volunteers", List.of("Stand_Rosters_Shifts", "Member_Directory")),
                new FolderSpec("Fundraising", "Fundraising", prefix + "_Fundraising", List.of("Sponsor_Agreements", "Campaign_Assets")),
                new FolderSpec("General", "General_Operations", prefix + "_General_Operations", List.of("Events_Tasks", "Meeting_Notes")),
                new FolderSpec("Marketing", "Marketing", null, List.of())
        );
    }

    public synchronized List<GoogleDriveFolderDTO> ensureDriveFolderHierarchy() {
        if (this.cachedFolderHierarchy != null && !this.cachedFolderHierarchy.isEmpty()) {
            return this.cachedFolderHierarchy;
        }

        try {
            Drive drive = getDriveService();
            String rootFolderId = getEffectiveFolderId();

            if (rootFolderId == null || rootFolderId.isBlank()) {
                File rootFolder = ensureFolder(drive, null, getRootWorkspaceFolderTitle());
                rootFolderId = rootFolder.getId();
                setCustomFolderId(rootFolderId, null);
                log.info("Initialized root Google Drive workspace folder: {} ({})", getRootWorkspaceFolderTitle(), rootFolderId);
            }

            List<GoogleDriveFolderDTO> resultHierarchy = new ArrayList<>();

            for (FolderSpec spec : getDomainFolderSpecs()) {
                File domainFolder = ensureFolder(drive, rootFolderId, spec.folderName);
                String domainFolderId = domainFolder.getId();
                folderCache.put(spec.domain, domainFolderId);
                folderCache.put(spec.folderName, domainFolderId);
                folderCache.put(spec.domain.toLowerCase(), domainFolderId);
                folderCache.put(spec.folderName.toLowerCase(), domainFolderId);

                // Discover or create dedicated Sheet inside this section folder (if configured)
                String domainSheetId = null;
                if (spec.sheetTitle != null && !spec.sheetTitle.isBlank()) {
                    domainSheetId = domainSpreadsheetCache.get(spec.domain);
                    if (domainSheetId == null || domainSheetId.isBlank()) {
                        File sheetFile = ensureSpreadsheetInFolder(drive, domainFolderId, spec.sheetTitle);
                        domainSheetId = sheetFile.getId();
                        domainSpreadsheetCache.put(spec.domain, domainSheetId);
                    }
                }

                GoogleDriveFolderDTO domainDto = new GoogleDriveFolderDTO(
                        spec.domain,
                        spec.folderName,
                        domainFolderId,
                        "https://drive.google.com/drive/folders/" + domainFolderId
                );
                if (domainSheetId != null) {
                    domainDto.setSpreadsheetId(domainSheetId);
                    domainDto.setSpreadsheetName(spec.sheetTitle);
                    domainDto.setSpreadsheetUrl("https://docs.google.com/spreadsheets/d/" + domainSheetId + "/edit");
                }

                for (String subName : spec.subfolders) {
                    File subFolder = ensureFolder(drive, domainFolderId, subName);
                    String subFolderId = subFolder.getId();
                    folderCache.put(spec.domain + ":" + subName, subFolderId);
                    folderCache.put(spec.folderName + ":" + subName, subFolderId);
                    folderCache.put(subName, subFolderId);
                    folderCache.put((spec.domain + ":" + subName).toLowerCase(), subFolderId);
                    folderCache.put((spec.folderName + ":" + subName).toLowerCase(), subFolderId);
                    folderCache.put(subName.toLowerCase(), subFolderId);

                    domainDto.addSubfolder(new GoogleDriveSubfolderDTO(
                            subName,
                            subFolderId,
                            "https://drive.google.com/drive/folders/" + subFolderId
                    ));
                }

                resultHierarchy.add(domainDto);
            }

            this.cachedFolderHierarchy = resultHierarchy;
            return resultHierarchy;

        } catch (Exception e) {
            log.warn("Could not ensure Google Drive folder hierarchy: {}", e.getMessage());
            return this.cachedFolderHierarchy;
        }
    }

    private File findFolder(Drive drive, String parentId, String folderName) throws IOException {
        String q = "name = '" + folderName.replace("'", "\\'") + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        if (parentId != null && !parentId.isBlank()) {
            q += " and '" + parentId + "' in parents";
        }
        var list = drive.files().list()
                .setQ(q)
                .setSupportsAllDrives(true)
                .setIncludeItemsFromAllDrives(true)
                .setFields("files(id, name, webViewLink, parents)")
                .execute();
        if (list.getFiles() != null && !list.getFiles().isEmpty()) {
            return list.getFiles().get(0);
        }
        return null;
    }

    private File ensureFolder(Drive drive, String parentId, String folderName) throws IOException {
        File existing = findFolder(drive, parentId, folderName);
        if (existing != null) {
            return existing;
        }
        File folderMetadata = new File();
        folderMetadata.setName(folderName);
        folderMetadata.setMimeType("application/vnd.google-apps.folder");
        if (parentId != null && !parentId.isBlank()) {
            folderMetadata.setParents(Collections.singletonList(parentId));
        }
        return drive.files().create(folderMetadata)
                .setSupportsAllDrives(true)
                .setFields("id, name, webViewLink, parents")
                .execute();
    }

    private File ensureSpreadsheetInFolder(Drive drive, String parentFolderId, String title) throws IOException {
        String q = "name = '" + title.replace("'", "\\'") + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
        if (parentFolderId != null && !parentFolderId.isBlank()) {
            q += " and '" + parentFolderId + "' in parents";
        }
        var list = drive.files().list()
                .setQ(q)
                .setSupportsAllDrives(true)
                .setIncludeItemsFromAllDrives(true)
                .setFields("files(id, name, webViewLink, parents)")
                .execute();
        if (list.getFiles() != null && !list.getFiles().isEmpty()) {
            return list.getFiles().get(0);
        }

        // Check if legacy Charity_ section spreadsheet exists in folder and rename it to new title
        if (title.contains("_")) {
            String suffix = title.substring(title.indexOf('_'));
            String legacyTitle = "Charity" + suffix;
            String legacyQ = "name = '" + legacyTitle.replace("'", "\\'") + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
            if (parentFolderId != null && !parentFolderId.isBlank()) {
                legacyQ += " and '" + parentFolderId + "' in parents";
            }
            var legacyList = drive.files().list()
                    .setQ(legacyQ)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setFields("files(id, name, webViewLink, parents)")
                    .execute();
            if (legacyList.getFiles() != null && !legacyList.getFiles().isEmpty()) {
                File legacyFile = legacyList.getFiles().get(0);
                File updateMeta = new File();
                updateMeta.setName(title);
                File renamed = drive.files().update(legacyFile.getId(), updateMeta)
                        .setSupportsAllDrives(true)
                        .setFields("id, name, webViewLink, parents")
                        .execute();
                log.info("Renamed legacy Google Sheet '{}' to '{}' ({}) in folder [{}]", legacyFile.getName(), title, renamed.getId(), parentFolderId);
                return renamed;
            }
        }

        File newFile = new File();
        newFile.setName(title);
        newFile.setMimeType("application/vnd.google-apps.spreadsheet");
        if (parentFolderId != null && !parentFolderId.isBlank()) {
            newFile.setParents(Collections.singletonList(parentFolderId));
        }
        return drive.files().create(newFile)
                .setSupportsAllDrives(true)
                .setFields("id, name, webViewLink, parents")
                .execute();
    }

    public synchronized String ensureDomainSubfolderFast(String domain, String subfolderName) {
        String cacheKey = (domain + ":" + subfolderName).toLowerCase();
        String cached = folderCache.get(cacheKey);
        if (cached != null && !cached.isBlank()) {
            return cached;
        }

        try {
            Drive drive = getDriveService();
            if (drive == null) return null;
            String rootFolderId = getEffectiveFolderId();
            if (rootFolderId == null || rootFolderId.isBlank()) {
                File rootFolder = ensureFolder(drive, null, getRootWorkspaceFolderTitle());
                rootFolderId = rootFolder.getId();
                setCustomFolderId(rootFolderId, null);
            }

            File domainFolder = ensureFolder(drive, rootFolderId, domain);
            String domainFolderId = domainFolder.getId();
            folderCache.put(domain.toLowerCase(), domainFolderId);

            File subFolder = ensureFolder(drive, domainFolderId, subfolderName);
            String subFolderId = subFolder.getId();
            folderCache.put(cacheKey, subFolderId);
            folderCache.put(subfolderName.toLowerCase(), subFolderId);
            folderCache.put(domain + ":" + subfolderName, subFolderId);
            return subFolderId;
        } catch (Exception e) {
            log.warn("Fast domain subfolder creation failed for {}:{}: {}", domain, subfolderName, e.getMessage());
            return null;
        }
    }

    public String getLegalGeneratedDocsFolderId() {
        String[] keys = new String[] {
                "Legal:Generated_Documents", "Legal:generated_documents", "Generated_Documents", "generated_documents",
                "Legal:Generated Documents", "Legal:Generated_Contracts", "Legal:generated_contracts", "Generated_Contracts"
        };
        for (String k : keys) {
            String cached = folderCache.get(k);
            if (cached != null) return cached;
            cached = folderCache.get(k.toLowerCase());
            if (cached != null) return cached;
        }
        return ensureDomainSubfolderFast("Legal", "Generated_Documents");
    }

    public String getLegalTemplatesFolderId() {
        String[] keys = new String[] {
                "Legal:Templates", "Legal:templates", "Templates", "templates"
        };
        for (String k : keys) {
            String cached = folderCache.get(k);
            if (cached != null) return cached;
            cached = folderCache.get(k.toLowerCase());
            if (cached != null) return cached;
        }
        return ensureDomainSubfolderFast("Legal", "Templates");
    }

    public String getFinanceReceiptsFolderId() {
        String[] keys = new String[] {
                "Finances:Receipts_Invoices", "Finances:receipts_invoices", "Receipts_Invoices", "receipts_invoices",
                "Finances:Receipts & Invoices"
        };
        for (String k : keys) {
            String cached = folderCache.get(k);
            if (cached != null) return cached;
            cached = folderCache.get(k.toLowerCase());
            if (cached != null) return cached;
        }
        ensureDriveFolderHierarchy();
        for (String k : keys) {
            String res = folderCache.get(k);
            if (res != null) return res;
            res = folderCache.get(k.toLowerCase());
            if (res != null) return res;
        }
        return null;
    }

    public String getMarketingFolderId() {
        String[] keys = new String[] { "Marketing", "marketing", "Resources", "resources" };
        for (String k : keys) {
            String cached = folderCache.get(k);
            if (cached != null && !cached.isBlank()) return cached;
        }

        try {
            Drive drive = getDriveService();
            if (drive == null) return null;
            String rootFolderId = getEffectiveFolderId();

            if (rootFolderId != null && !rootFolderId.isBlank()) {
                File folder = findFolder(drive, rootFolderId, "Marketing");
                if (folder == null) folder = findFolder(drive, rootFolderId, "marketing");
                if (folder == null) folder = findFolder(drive, rootFolderId, "Resources");
                if (folder == null) folder = findFolder(drive, rootFolderId, "resources");

                if (folder != null) {
                    folderCache.put("Marketing", folder.getId());
                    folderCache.put("marketing", folder.getId());
                    return folder.getId();
                }

                // If not found, ensure it is created inside the root workspace folder
                File created = ensureFolder(drive, rootFolderId, "Marketing");
                if (created != null) {
                    folderCache.put("Marketing", created.getId());
                    folderCache.put("marketing", created.getId());
                    return created.getId();
                }
            }

            return rootFolderId;
        } catch (Exception e) {
            log.warn("Could not find or create marketing folder in Google Drive: {}", e.getMessage());
            return getEffectiveFolderId();
        }
    }

    public String uploadScannedReceipt(byte[] fileBytes, String contentType, String originalFilename, LocalDate transactionDate, String expenseName) {
        if (fileBytes == null || fileBytes.length == 0) {
            return null;
        }
        try {
            Drive drive = getDriveService();
            if (drive == null) return null;

            String receiptsFolderId = getFinanceReceiptsFolderId();
            if (receiptsFolderId == null || receiptsFolderId.isBlank()) {
                log.warn("Cannot upload receipt to Google Drive: receipts_invoices folder not found.");
                return null;
            }

            // 1. Determine file extension
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            }
            if (ext.isBlank()) {
                if ("application/pdf".equalsIgnoreCase(contentType)) ext = ".pdf";
                else if ("image/png".equalsIgnoreCase(contentType)) ext = ".png";
                else if ("image/webp".equalsIgnoreCase(contentType)) ext = ".webp";
                else ext = ".jpg";
            }

            // 2. Format date (YYYY-MM-DD)
            String dateStr = (transactionDate != null ? transactionDate : LocalDate.now()).format(DATE_FORMATTER);

            // 3. Format clean expense name with underscores, no spaces
            String cleanName = "";
            if (expenseName != null && !expenseName.isBlank()) {
                cleanName = expenseName.trim()
                        .replaceAll("[^\\p{L}\\p{Nd}]+", "_")
                        .replaceAll("^_+|_+$", "");
            }
            if (cleanName.isBlank()) {
                cleanName = "Expense";
            }

            // Base filename: DATE_EXPENSE_NAME
            String baseFileName = dateStr + "_" + cleanName;

            // 4. Resolve unique filename with duplicate counter if necessary (DATE_EXPENSE_NAME_2, etc.)
            String finalFileName = resolveUniqueFileName(drive, receiptsFolderId, baseFileName, ext);

            // 5. Upload file to Google Drive
            File fileMetadata = new File();
            fileMetadata.setName(finalFileName);
            fileMetadata.setParents(Collections.singletonList(receiptsFolderId));

            String resolvedMime = (contentType != null && !contentType.isBlank()) ? contentType : "application/octet-stream";
            com.google.api.client.http.ByteArrayContent mediaContent = new com.google.api.client.http.ByteArrayContent(resolvedMime, fileBytes);

            File uploadedFile = drive.files().create(fileMetadata, mediaContent)
                    .setSupportsAllDrives(true)
                    .setFields("id, name, webViewLink, webContentLink")
                    .execute();

            String webLink = uploadedFile.getWebViewLink();
            if (webLink == null || webLink.isBlank()) {
                webLink = "https://drive.google.com/file/d/" + uploadedFile.getId() + "/view";
            }

            log.info("Uploaded scanned receipt '{}' to Google Drive folder [{}]: {}", finalFileName, receiptsFolderId, webLink);
            return webLink;
        } catch (Exception e) {
            log.warn("Failed to upload scanned receipt to Google Drive: {}", e.getMessage());
            return null;
        }
    }

    private String resolveUniqueFileName(Drive drive, String parentFolderId, String baseFileName, String ext) {
        return resolveUniqueFileName(drive, parentFolderId, baseFileName, ext, null);
    }

    private String resolveUniqueFileName(Drive drive, String parentFolderId, String baseFileName, String ext, String excludeFileId) {
        try {
            String q = "'" + parentFolderId + "' in parents and trashed = false and name contains '" + baseFileName.replace("'", "\\'") + "'";
            var list = drive.files().list()
                    .setQ(q)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setFields("files(id, name)")
                    .execute();

            Set<String> existingNames = new HashSet<>();
            if (list.getFiles() != null) {
                for (File f : list.getFiles()) {
                    if (f.getName() != null) {
                        if (excludeFileId != null && excludeFileId.equals(f.getId())) {
                            continue;
                        }
                        existingNames.add(f.getName().toLowerCase());
                    }
                }
            }

            String candidate = baseFileName + ext;
            if (!existingNames.contains(candidate.toLowerCase())) {
                return candidate;
            }

            int counter = 2;
            while (existingNames.contains((baseFileName + "_" + counter + ext).toLowerCase())) {
                counter++;
            }
            return baseFileName + "_" + counter + ext;
        } catch (Exception e) {
            log.warn("Could not query existing files for duplicates: {}", e.getMessage());
            return baseFileName + ext;
        }
    }

    public static String extractGoogleDriveFileId(String input) {
        if (input == null || input.isBlank()) return null;
        String trimmed = input.trim();
        Matcher matcher = Pattern.compile("(?:/file/d/|/d/|id=)([a-zA-Z0-9_-]{15,})").matcher(trimmed);
        if (matcher.find()) {
            return matcher.group(1);
        }
        if (trimmed.matches("^[a-zA-Z0-9_-]{15,}$")) {
            return trimmed;
        }
        return null;
    }

    public boolean deleteFile(String fileUrlOrId) {
        String fileId = extractGoogleDriveFileId(fileUrlOrId);
        if (fileId == null || fileId.isBlank()) {
            return false;
        }
        try {
            Drive drive = getDriveService();
            if (drive == null) return false;
            drive.files().delete(fileId).setSupportsAllDrives(true).execute();
            log.info("Deleted Google Drive file with ID: {}", fileId);
            return true;
        } catch (Exception e) {
            log.warn("Failed to delete Google Drive file {}: {}", fileId, e.getMessage());
            return false;
        }
    }

    public List<com.charityapp.dto.sync.DriveReceiptFileDto> listRecentDriveReceiptFiles() {
        List<com.charityapp.dto.sync.DriveReceiptFileDto> result = new ArrayList<>();
        try {
            Drive drive = getDriveService();
            if (drive == null) return result;

            String receiptsFolderId = getFinanceReceiptsFolderId();

            String q = "trashed = false and (mimeType = 'application/pdf' or mimeType contains 'image/')";
            if (receiptsFolderId != null && !receiptsFolderId.isBlank()) {
                q += " and ('" + receiptsFolderId + "' in parents or parents in '" + receiptsFolderId + "')";
            }

            var list = drive.files().list()
                    .setQ(q)
                    .setOrderBy("modifiedTime desc")
                    .setPageSize(25)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setFields("files(id, name, mimeType, webViewLink, thumbnailLink, size, modifiedTime, parents)")
                    .execute();

            if (list.getFiles() != null) {
                for (File f : list.getFiles()) {
                    boolean inReceipts = (receiptsFolderId != null && f.getParents() != null && f.getParents().contains(receiptsFolderId));
                    String modTimeStr = f.getModifiedTime() != null ? f.getModifiedTime().toStringRfc3339() : null;
                    result.add(new com.charityapp.dto.sync.DriveReceiptFileDto(
                            f.getId(),
                            f.getName(),
                            f.getMimeType(),
                            f.getWebViewLink() != null ? f.getWebViewLink() : ("https://drive.google.com/file/d/" + f.getId() + "/view"),
                            f.getThumbnailLink(),
                            f.getSize(),
                            modTimeStr,
                            inReceipts
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("Could not list recent Drive receipt files: {}", e.getMessage());
        }
        return result;
    }
    public ScannedExpenseDto processDriveReceipt(
            String fileUrlOrId,
            List<String> userCategories,
            com.charityapp.service.finance.GeminiReceiptScannerService scannerService,
            List<String> dbCategories) {
        String fileId = extractGoogleDriveFileId(fileUrlOrId);
        if (fileId == null || fileId.isBlank()) {
            throw new IllegalArgumentException("Link-ul sau ID-ul Google Drive este invalid.");
        }

        try {
            Drive drive = getDriveService();
            if (drive == null) {
                throw new IllegalStateException("Serviciul Google Drive nu este configurat.");
            }

            File driveFile = drive.files().get(fileId)
                    .setSupportsAllDrives(true)
                    .setFields("id, name, mimeType, parents, webViewLink, webContentLink, size")
                    .execute();

            if (driveFile == null) {
                throw new IllegalArgumentException("Fișierul Google Drive nu a putut fi găsit.");
            }

            byte[] fileBytes;
            try (InputStream in = drive.files().get(fileId).setSupportsAllDrives(true).executeMediaAsInputStream()) {
                fileBytes = in.readAllBytes();
            }

            if (fileBytes == null || fileBytes.length == 0) {
                throw new IllegalArgumentException("Fișierul Google Drive este gol.");
            }

            Set<String> allCategories = new LinkedHashSet<>();
            if (userCategories != null) {
                for (String c : userCategories) {
                    if (c != null && !c.isBlank()) allCategories.add(c.trim());
                }
            }
            if (dbCategories != null) {
                allCategories.addAll(dbCategories);
            }

            ScannedExpenseDto scanned = scannerService.scanReceipt(
                    fileBytes,
                    driveFile.getMimeType(),
                    driveFile.getName(),
                    new ArrayList<>(allCategories)
            );

            String ext = "";
            String originalFilename = driveFile.getName();
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            }
            if (ext.isBlank()) {
                String mime = driveFile.getMimeType();
                if ("application/pdf".equalsIgnoreCase(mime)) ext = ".pdf";
                else if ("image/png".equalsIgnoreCase(mime)) ext = ".png";
                else if ("image/webp".equalsIgnoreCase(mime)) ext = ".webp";
                else ext = ".jpg";
            }

            LocalDate txDate = scanned.getTransactionDate() != null ? scanned.getTransactionDate() : LocalDate.now();
            String dateStr = txDate.format(DATE_FORMATTER);

            String rawName = scanned.getName();
            if (rawName == null || rawName.isBlank()) {
                rawName = scanned.getMerchantName();
            }
            if (rawName == null || rawName.isBlank()) {
                rawName = "Expense";
            }

            String cleanName = rawName.trim()
                    .replaceAll("[^\\p{L}\\p{Nd}]+", "_")
                    .replaceAll("^_+|_+$", "");
            if (cleanName.isBlank()) {
                cleanName = "Expense";
            }

            String baseFileName = dateStr + "_" + cleanName;
            String receiptsFolderId = getFinanceReceiptsFolderId();

            if (receiptsFolderId != null && !receiptsFolderId.isBlank()) {
                boolean alreadyInReceipts = driveFile.getParents() != null && driveFile.getParents().contains(receiptsFolderId);

                if (alreadyInReceipts) {
                    String finalFileName = resolveUniqueFileName(drive, receiptsFolderId, baseFileName, ext, fileId);
                    File updateMeta = new File();
                    updateMeta.setName(finalFileName);
                    File updated = drive.files().update(fileId, updateMeta)
                            .setSupportsAllDrives(true)
                            .setFields("id, name, webViewLink")
                            .execute();

                    String finalUrl = updated.getWebViewLink() != null ? updated.getWebViewLink() : driveFile.getWebViewLink();
                    scanned.setReceiptUrl(finalUrl);
                    scanned.setReceiptAttachment(finalUrl);
                    log.info("Renamed existing receipt in Google Drive folder [{}] to '{}': {}", receiptsFolderId, finalFileName, finalUrl);
                } else {
                    String finalFileName = resolveUniqueFileName(drive, receiptsFolderId, baseFileName, ext, null);
                    String oldParents = driveFile.getParents() != null ? String.join(",", driveFile.getParents()) : "";

                    File finalFile;
                    try {
                        File updateMeta = new File();
                        updateMeta.setName(finalFileName);
                        finalFile = drive.files().update(fileId, updateMeta)
                                .setAddParents(receiptsFolderId)
                                .setRemoveParents(oldParents)
                                .setSupportsAllDrives(true)
                                .setFields("id, name, webViewLink")
                                .execute();
                    } catch (Exception moveErr) {
                        log.warn("Could not move Drive file {}, copying into Receipts_Invoices instead: {}", fileId, moveErr.getMessage());
                        File copyMeta = new File();
                        copyMeta.setName(finalFileName);
                        copyMeta.setParents(Collections.singletonList(receiptsFolderId));
                        finalFile = drive.files().copy(fileId, copyMeta)
                                .setSupportsAllDrives(true)
                                .setFields("id, name, webViewLink")
                                .execute();
                    }

                    String finalUrl = finalFile.getWebViewLink() != null ? finalFile.getWebViewLink() : ("https://drive.google.com/file/d/" + finalFile.getId() + "/view");
                    scanned.setReceiptUrl(finalUrl);
                    scanned.setReceiptAttachment(finalUrl);
                    log.info("Saved/moved receipt to Receipts_Invoices folder [{}] as '{}': {}", receiptsFolderId, finalFileName, finalUrl);
                }
            } else {
                String finalUrl = driveFile.getWebViewLink() != null ? driveFile.getWebViewLink() : ("https://drive.google.com/file/d/" + driveFile.getId() + "/view");
                scanned.setReceiptUrl(finalUrl);
                scanned.setReceiptAttachment(finalUrl);
            }

            return scanned;
        } catch (Exception e) {
            log.error("Error processing Google Drive receipt: {}", e.getMessage(), e);
            throw new RuntimeException("Eroare la procesarea bonului din Google Drive: " + e.getMessage(), e);
        }
    }
}
