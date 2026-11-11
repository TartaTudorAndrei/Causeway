package com.charityapp.service.google;
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
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.*;
import com.charityapp.config.AppConfigProperties;
import com.charityapp.dto.sync.GoogleDriveFolderDTO;
import com.charityapp.dto.sync.GoogleSyncStatusDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.charityapp.event.DashboardDataChangedEvent;
import com.charityapp.service.sync.DashboardExportable;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("deprecation")
public class GoogleDashboardSyncService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDashboardSyncService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @org.springframework.beans.factory.annotation.Value("${GOOGLE_DRIVE_FOLDER_ID:}")
    private String googleDriveFolderIdProp;
    private final AppConfigProperties properties;
    private final com.charityapp.config.TenantProperties tenantProperties;
    private final com.charityapp.config.GoogleCredentialFactory credentialFactory;
    private final AppSettingsService appSettingsService;
    private final GoogleDriveService googleDriveService;
    private final List<DashboardExportable> exporters;

    // Local in-memory caches for dynamic discovery
    private volatile String cachedSpreadsheetId = null;

    // Real-time tracking of sync state
    private volatile String lastSyncStatus = "IDLE";
    private volatile String lastSyncMessage = "Nicio sincronizare executată încă.";
    private volatile LocalDateTime lastSyncTimestamp = null;
    private volatile int lastSyncedTabsCount = 0;
    private volatile int lastTotalRowsSynced = 0;
    private volatile List<String> lastSyncedTabNames = new ArrayList<>();

    // Debounce state for real-time event-driven updates
    private final AtomicBoolean isDirty = new AtomicBoolean(false);
    private final AtomicLong lastChangeTimestamp = new AtomicLong(0);
    private final AtomicLong firstDirtyTimestamp = new AtomicLong(0);
    private final AtomicBoolean isSyncInProgress = new AtomicBoolean(false);

    // High-performance thread pool for concurrent spreadsheet synchronization
    private final java.util.concurrent.ExecutorService syncExecutor;

    public GoogleDashboardSyncService(
            AppConfigProperties properties,
            JdbcTemplate jdbcTemplate,
            List<DashboardExportable> exporters,
            AppSettingsService appSettingsService,
            GoogleDriveService googleDriveService,
            com.charityapp.config.GoogleCredentialFactory credentialFactory) {
        this(properties, jdbcTemplate, exporters, appSettingsService, googleDriveService, new com.charityapp.config.TenantProperties(), credentialFactory);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleDashboardSyncService(
            AppConfigProperties properties,
            JdbcTemplate jdbcTemplate,
            List<DashboardExportable> exporters,
            AppSettingsService appSettingsService,
            GoogleDriveService googleDriveService,
            com.charityapp.config.TenantProperties tenantProperties,
            com.charityapp.config.GoogleCredentialFactory credentialFactory) {
        this.properties = properties;
        this.appSettingsService = appSettingsService;
        this.googleDriveService = googleDriveService;
        this.tenantProperties = tenantProperties != null ? tenantProperties : new com.charityapp.config.TenantProperties();
        this.credentialFactory = credentialFactory;
        this.exporters = exporters;
        this.syncExecutor = java.util.concurrent.Executors.newFixedThreadPool(8);
    }




    @jakarta.annotation.PreDestroy
    public void shutdown() {
        syncExecutor.shutdown();
        try {
            if (!syncExecutor.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS)) {
                syncExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            syncExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }


        public void setCustomFolderId(String folderId) {
        googleDriveService.setCustomFolderId(folderId, getEffectiveSpreadsheetId());
    }

public String getEffectiveSpreadsheetId() {
        if (cachedSpreadsheetId != null && !cachedSpreadsheetId.isBlank()) {
            return cachedSpreadsheetId;
        }
        String dbVal = appSettingsService.getSetting("google_sheets_spreadsheet_id");
        if (!isBlank(dbVal)) {
            cachedSpreadsheetId = dbVal.trim();
            return cachedSpreadsheetId;
        }
        if (properties != null && properties.getGoogle() != null && properties.getGoogle().getSheets() != null) {
            String propVal = properties.getGoogle().getSheets().getSpreadsheetId();
            if (!isBlank(propVal)) {
                cachedSpreadsheetId = propVal.trim();
                return cachedSpreadsheetId;
            }
        }
        String envVal = System.getenv("GOOGLE_SHEETS_SPREADSHEET_ID");
        if (!isBlank(envVal)) {
            cachedSpreadsheetId = envVal.trim();
            return cachedSpreadsheetId;
        }
        return null;
    }

    public void setCustomSpreadsheetId(String spreadsheetId) {
        String cleanId = spreadsheetId != null ? spreadsheetId.trim() : "";
        this.cachedSpreadsheetId = cleanId.isBlank() ? null : cleanId;
        appSettingsService.saveSetting("google_sheets_spreadsheet_id", cleanId);
        if (properties != null && properties.getGoogle() != null && properties.getGoogle().getSheets() != null) {
            properties.getGoogle().getSheets().setSpreadsheetId(cleanId);
        }
    }

    // ================= REAL-TIME DEBOUNCED EVENT SYNC =================

    @EventListener
    public void onDashboardDataChanged(DashboardDataChangedEvent event) {
        notifyDataChanged(event.getDomain() + ":" + event.getAction());
    }

    public void notifyDataChanged(String reason) {
        long now = System.currentTimeMillis();
        lastChangeTimestamp.set(now);
        if (isDirty.compareAndSet(false, true)) {
            firstDirtyTimestamp.set(now);
        }
        log.info("Dashboard data change recorded [{}]. Google Sheets sync queued (15s quiet debounce).", reason);
    }

    @Scheduled(fixedDelay = 5000)
    public void processDebouncedSyncQueue() {
        if (!isDirty.get() || isSyncInProgress.get()) {
            return;
        }

        long now = System.currentTimeMillis();
        long timeSinceLastChange = now - lastChangeTimestamp.get();
        long timeSinceFirstDirty = now - firstDirtyTimestamp.get();

        if (timeSinceLastChange >= 15_000 || timeSinceFirstDirty >= 60_000) {
            if (isDirty.compareAndSet(true, false)) {
                triggerAsyncDebouncedSync();
            }
        }
    }

    private void triggerAsyncDebouncedSync() {
        if (isSyncInProgress.compareAndSet(false, true)) {
            CompletableFuture.runAsync(() -> {
                try {
                    log.info("Debounced Google Sheets sync starting in background...");
                    syncAllDashboardData();
                } catch (Exception e) {
                    log.error("Debounced Google Sheets sync failed: {}", e.getMessage());
                } finally {
                    isSyncInProgress.set(false);
                }
            });
        }
    }

    // ================= CREDENTIAL DISCOVERY & API CLIENTS =================

    public String getGoogleCredentialsJson() {
        return credentialFactory.resolveCredentialsJson("sheets");
    }

    public Sheets getSheetsService() throws Exception {
        GoogleCredential credential = credentialFactory.createCredential(
                Arrays.asList(SheetsScopes.SPREADSHEETS, DriveScopes.DRIVE, DriveScopes.DRIVE_FILE),
                "sheets"
        );

        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName(getMasterSpreadsheetTitle() + " Sync")
                .build();
    }


    public String getServiceAccountEmail() {
        return credentialFactory.getAccountEmailOrClientId("sheets");
    }

    public GoogleSyncStatusDTO getStatus() {
        GoogleSyncStatusDTO dto = new GoogleSyncStatusDTO();
        String json = getGoogleCredentialsJson();
        if (json == null || json.isBlank()) {
            dto.setConnected(false);
            dto.setMode("NOT_CONFIGURED");
            dto.setMessage("Credențialele Google (OAuth sau Service Account) lipsesc. Configurați GOOGLE_OAUTH_CREDENTIALS_JSON / GOOGLE_CREDENTIALS_JSON.");
            dto.setLastSyncStatus("NOT_CONFIGURED");
            return dto;
        }

        boolean isOAuth = credentialFactory.isOAuthClientSecrets(json);
        dto.setConnected(true);
        dto.setMode(isOAuth ? "OAUTH_USER" : "SERVICE_ACCOUNT");
        dto.setServiceAccountEmail(credentialFactory.getAccountEmailOrClientId("sheets"));
        
        String activeSpreadsheetId = getEffectiveSpreadsheetId();
        dto.setSpreadsheetId(activeSpreadsheetId);
        if (activeSpreadsheetId != null && !activeSpreadsheetId.isBlank()) {
            dto.setSpreadsheetUrl("https://docs.google.com/spreadsheets/d/" + activeSpreadsheetId + "/edit");
        }

        String activeFolderId = googleDriveService.getEffectiveFolderId();
        dto.setFolderId(activeFolderId);
        if (activeFolderId != null && !activeFolderId.isBlank()) {
            dto.setFolderUrl("https://drive.google.com/drive/folders/" + activeFolderId);
        }

        dto.setLastSyncTimestamp(lastSyncTimestamp);
        dto.setLastSyncStatus(lastSyncStatus);
        dto.setMessage(lastSyncMessage);
        dto.setSyncedTabsCount(lastSyncedTabsCount);
        dto.setSyncedTabNames(lastSyncedTabNames);
        dto.setTotalRowsSynced(lastTotalRowsSynced);
        dto.setFolders(googleDriveService.getCachedFolderHierarchy());
        return dto;
    }

    // ================= HIERARCHICAL GOOGLE DRIVE FOLDERS & SECTION SHEETS =================

    public String getMasterSpreadsheetTitle() {
        if (tenantProperties != null && tenantProperties.getIntegrations() != null && !isBlank(tenantProperties.getIntegrations().getGoogleSheetsMasterTitle())) {
            return tenantProperties.getIntegrations().getGoogleSheetsMasterTitle().trim();
        }
        if (googleDriveService != null) {
            return googleDriveService.getSpreadsheetPrefix() + "_Dashboard";
        }
        String envTitle = System.getenv("APP_GOOGLE_SHEETS_MASTER_TITLE");
        if (!isBlank(envTitle)) return envTitle.trim();
        return "Charity_Dashboard";
    }

    // ================= SPREADSHEET DISCOVERY & CREATION =================

    public String resolveOrCreateMasterSpreadsheet() throws Exception {
        Drive drive = googleDriveService.getDriveService();
        String masterTitle = getMasterSpreadsheetTitle();
        String existingId = getEffectiveSpreadsheetId();

        if (existingId != null && !existingId.isBlank()) {
            try {
                drive.files().get(existingId).setSupportsAllDrives(true).setFields("id, name, trashed").execute();
                return existingId;
            } catch (Exception e) {
                log.warn("Master spreadsheet ID '{}' was not found or is inaccessible ({}), re-resolving or creating...", existingId, e.getMessage());
                setCustomSpreadsheetId(null);
            }
        }

        String folderId = googleDriveService.getEffectiveFolderId();

        // Ensure hierarchical folders and section sheets exist
        googleDriveService.ensureDriveFolderHierarchy();
        if (folderId == null || folderId.isBlank()) {
            folderId = googleDriveService.getEffectiveFolderId();
        }

        String query = "name = '" + masterTitle.replace("'", "\\'") + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
        if (folderId != null && !folderId.isBlank()) {
            query += " and '" + folderId + "' in parents";
        }

        var list = drive.files().list()
                .setQ(query)
                .setSupportsAllDrives(true)
                .setIncludeItemsFromAllDrives(true)
                .setFields("files(id, name, webViewLink)")
                .execute();

        if (list.getFiles() != null && !list.getFiles().isEmpty()) {
            File existing = list.getFiles().get(0);
            setCustomSpreadsheetId(existing.getId());
            log.info("Found existing master spreadsheet in Google Drive: {}", cachedSpreadsheetId);
            return cachedSpreadsheetId;
        }

        // Check if legacy Charity_Dashboard exists in folder and rename it to masterTitle
        if (masterTitle.contains("_")) {
            String suffix = masterTitle.substring(masterTitle.indexOf('_'));
            String legacyTitle = "Charity" + suffix;
            String legacyQ = "name = '" + legacyTitle.replace("'", "\\'") + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
            if (folderId != null && !folderId.isBlank()) {
                legacyQ += " and '" + folderId + "' in parents";
            }
            var legacyList = drive.files().list()
                    .setQ(legacyQ)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setFields("files(id, name, webViewLink)")
                    .execute();
            if (legacyList.getFiles() != null && !legacyList.getFiles().isEmpty()) {
                File legacyFile = legacyList.getFiles().get(0);
                File updateMeta = new File();
                updateMeta.setName(masterTitle);
                File renamed = drive.files().update(legacyFile.getId(), updateMeta)
                        .setSupportsAllDrives(true)
                        .setFields("id, name, webViewLink")
                        .execute();
                setCustomSpreadsheetId(renamed.getId());
                log.info("Renamed legacy master spreadsheet '{}' to '{}': {}", legacyFile.getName(), masterTitle, cachedSpreadsheetId);
                return cachedSpreadsheetId;
            }
        }

        File newFile = new File();
        newFile.setName(masterTitle);
        newFile.setMimeType("application/vnd.google-apps.spreadsheet");
        if (folderId != null && !folderId.isBlank()) {
            newFile.setParents(Collections.singletonList(folderId));
        }

        File created = drive.files().create(newFile)
                .setSupportsAllDrives(true)
                .setFields("id, name, webViewLink")
                .execute();

        setCustomSpreadsheetId(created.getId());
        log.info("Created new master spreadsheet in Google Drive folder [{}]: {}", folderId, cachedSpreadsheetId);
        return cachedSpreadsheetId;
    }

    // ================= DATA PREPARATION FOR ALL TABS =================

    public static class TabSyncData {
        public final String title;
        public final String domain; // "OVERVIEW", "FINANCE", "LOGISTICS", "HR", "FUNDRAISING", "GENERAL", "LEGAL"
        public final List<String> headers;
        public final List<List<Object>> rows;
        public final boolean isOverview;

        public TabSyncData(String title, String domain, List<String> headers, List<List<Object>> rows, boolean isOverview) {
            this.title = title;
            this.domain = domain;
            this.headers = headers;
            this.rows = rows;
            this.isOverview = isOverview;
        }
    }

    public List<TabSyncData> buildAllDashboardTabs() {
        List<TabSyncData> allTabs = new ArrayList<>();
        for (DashboardExportable exp : exporters) {
            if (exp instanceof com.charityapp.service.sync.MultiTabDashboardExportable multi) {
                for (DashboardExportable tab : multi.getTabs()) {
                    allTabs.add(new TabSyncData(tab.getTabName(), tab.getDomain(), tab.getHeaders(), tab.getRows(), tab.isOverview()));
                }
            } else {
                allTabs.add(new TabSyncData(exp.getTabName(), exp.getDomain(), exp.getHeaders(), exp.getRows(), exp.isOverview()));
            }
        }
        return allTabs;
    }
    // ================= FULL EXECUTION & SYNCHRONIZATION =================

    @Scheduled(cron = "${app.google.sheets.sync-cron:0 0 * * * *}")
    public synchronized GoogleSyncStatusDTO syncAllDashboardData() {
        log.info("Starting {} Dashboard Parallel Sync to Google Drive / Sheets (Root & Section Folders)...", googleDriveService.getSpreadsheetPrefix());
        long startTime = System.currentTimeMillis();

        try {
            Sheets sheets = getSheetsService();
            
            // 1. Ensure folder hierarchy and section sheets in Google Drive (cached)
            List<GoogleDriveFolderDTO> folderHierarchy = googleDriveService.ensureDriveFolderHierarchy();

            // 2. Resolve Executive Spreadsheet (Root)
            String masterSpreadsheetId = resolveOrCreateMasterSpreadsheet();

            // 3. Build all dashboard data tabs
            List<TabSyncData> allTabs = buildAllDashboardTabs();

            // 4. Build domain grouping
            Map<String, List<TabSyncData>> tabsByDomain = allTabs.stream()
                    .collect(Collectors.groupingBy(t -> t.domain.toUpperCase()));

            List<CompletableFuture<Void>> syncFutures = new ArrayList<>();

            // 5. Parallel Sync: Executive Master Spreadsheet (All 17 tabs)
            syncFutures.add(CompletableFuture.runAsync(() -> {
                try {
                    syncSpreadsheetTabs(sheets, masterSpreadsheetId, allTabs);
                    log.info("Synced Executive Master Spreadsheet '{}'", masterSpreadsheetId);
                } catch (Exception ex) {
                    log.error("Could not sync Executive Master Spreadsheet: {}", ex.getMessage(), ex);
                    throw new RuntimeException(ex);
                }
            }, syncExecutor));

            // 6. Parallel Sync: Section Spreadsheets in their dedicated Drive folders
            for (GoogleDriveFolderDTO folderDto : folderHierarchy) {
                String domainSheetId = folderDto.getSpreadsheetId();
                if (domainSheetId != null && !domainSheetId.isBlank()) {
                    List<TabSyncData> domainTabs = new ArrayList<>();
                    
                    if ("Finances".equalsIgnoreCase(folderDto.getDomain())) {
                        domainTabs.addAll(tabsByDomain.getOrDefault("FINANCE", Collections.emptyList()));
                    } else if ("Legal".equalsIgnoreCase(folderDto.getDomain())) {
                        domainTabs.addAll(tabsByDomain.getOrDefault("LEGAL", Collections.emptyList()));
                    } else if ("Logistics".equalsIgnoreCase(folderDto.getDomain())) {
                        domainTabs.addAll(tabsByDomain.getOrDefault("LOGISTICS", Collections.emptyList()));
                    } else if ("HR".equalsIgnoreCase(folderDto.getDomain())) {
                        domainTabs.addAll(tabsByDomain.getOrDefault("HR", Collections.emptyList()));
                    } else if ("Fundraising".equalsIgnoreCase(folderDto.getDomain())) {
                        domainTabs.addAll(tabsByDomain.getOrDefault("FUNDRAISING", Collections.emptyList()));
                    } else if ("General".equalsIgnoreCase(folderDto.getDomain())) {
                        domainTabs.addAll(tabsByDomain.getOrDefault("OVERVIEW", Collections.emptyList()));
                        domainTabs.addAll(tabsByDomain.getOrDefault("GENERAL", Collections.emptyList()));
                    }

                    if (!domainTabs.isEmpty()) {
                        syncFutures.add(CompletableFuture.runAsync(() -> {
                            try {
                                syncSpreadsheetTabs(sheets, domainSheetId, domainTabs);
                                log.info("Synced dedicated section spreadsheet '{}' in folder '{}'", folderDto.getSpreadsheetName(), folderDto.getName());
                            } catch (Exception ex) {
                                log.warn("Could not sync section spreadsheet {}: {}", folderDto.getSpreadsheetName(), ex.getMessage());
                            }
                        }, syncExecutor));
                    }
                }
            }

            // Await all parallel spreadsheet synchronizations
            CompletableFuture.allOf(syncFutures.toArray(new CompletableFuture[0])).join();

            int totalRows = allTabs.stream().mapToInt(t -> t.rows.size()).sum();
            long elapsed = System.currentTimeMillis() - startTime;
            lastSyncTimestamp = LocalDateTime.now();
            lastSyncStatus = "SUCCESS";
            lastSyncedTabsCount = allTabs.size();
            lastTotalRowsSynced = totalRows;
            lastSyncedTabNames = allTabs.stream().map(t -> t.title).collect(Collectors.toList());
            lastSyncMessage = "Sincronizare completă reușită (" + allTabs.size() + " tabele stilizate, 6 sheets pe foldere, " + totalRows + " înregistrări, durată " + (elapsed / 1000.0) + "s).";

            log.info("Google Drive synchronization completed successfully in {}ms (Root + 6 Domain Sheets in parallel)", elapsed);
            return getStatus();

        } catch (Exception e) {
            log.error("Failed to sync Dashboard to Google Drive: {}", e.getMessage(), e);
            lastSyncTimestamp = LocalDateTime.now();
            lastSyncStatus = "FAILED";
            lastSyncMessage = "Eroare la sincronizare: " + e.getMessage();
            return getStatus();
        }
    }

    private void syncSpreadsheetTabs(Sheets sheets, String spreadsheetId, List<TabSyncData> tabDataList) throws Exception {
        Spreadsheet spreadsheet = sheets.spreadsheets().get(spreadsheetId).execute();

        // Map existing sheets by title
        Map<String, Sheet> existingSheetsMap = new HashMap<>();
        if (spreadsheet.getSheets() != null) {
            for (Sheet s : spreadsheet.getSheets()) {
                if (s.getProperties() != null && s.getProperties().getTitle() != null) {
                    existingSheetsMap.put(s.getProperties().getTitle(), s);
                }
            }
        }

        List<Request> structuralRequests = new ArrayList<>();
        Map<String, Integer> titleToSheetId = new HashMap<>();
        int nextDynamicSheetId = 100000;

        for (TabSyncData tab : tabDataList) {
            if (existingSheetsMap.containsKey(tab.title)) {
                Sheet existing = existingSheetsMap.get(tab.title);
                titleToSheetId.put(tab.title, existing.getProperties().getSheetId());
            } else {
                int assignedId = nextDynamicSheetId++;
                titleToSheetId.put(tab.title, assignedId);
                structuralRequests.add(new Request().setAddSheet(
                        new AddSheetRequest().setProperties(
                                new SheetProperties()
                                        .setSheetId(assignedId)
                                        .setTitle(tab.title)
                                        .setGridProperties(new GridProperties()
                                                .setRowCount(Math.max(100, tab.rows.size() + 20))
                                                .setColumnCount(Math.max(20, tab.headers.size() + 2))
                                                .setFrozenRowCount(tab.isOverview ? 3 : 1)
                                                .setHideGridlines(false))
                        )
                ));
            }
        }

        // Permanently remove unwanted default empty sheets (e.g., "Sheet1", "Foaie1") created automatically by Google
        Set<String> syncedTitles = tabDataList.stream().map(t -> t.title).collect(Collectors.toSet());
        int totalExpectedSheets = (spreadsheet.getSheets() != null ? spreadsheet.getSheets().size() : 0) + structuralRequests.size();
        if (spreadsheet.getSheets() != null && totalExpectedSheets > 1) {
            for (Sheet s : spreadsheet.getSheets()) {
                if (s.getProperties() != null && s.getProperties().getTitle() != null) {
                    String title = s.getProperties().getTitle();
                    if (!syncedTitles.contains(title) && (
                            title.equalsIgnoreCase("Sheet1") ||
                            title.equalsIgnoreCase("Foaie1") ||
                            title.equalsIgnoreCase("Sheet 1") ||
                            title.equalsIgnoreCase("Foaie 1") ||
                            title.toLowerCase().startsWith("sheet") ||
                            title.toLowerCase().startsWith("foaie")
                    )) {
                        structuralRequests.add(new Request().setDeleteSheet(
                                new DeleteSheetRequest().setSheetId(s.getProperties().getSheetId())
                        ));
                    }
                }
            }
        }

        if (!structuralRequests.isEmpty()) {
            try {
                sheets.spreadsheets().batchUpdate(spreadsheetId, new BatchUpdateSpreadsheetRequest().setRequests(structuralRequests)).execute();
                spreadsheet = sheets.spreadsheets().get(spreadsheetId).execute();
                existingSheetsMap.clear();
                for (Sheet s : spreadsheet.getSheets()) {
                    if (s.getProperties() != null && s.getProperties().getTitle() != null) {
                        existingSheetsMap.put(s.getProperties().getTitle(), s);
                        titleToSheetId.put(s.getProperties().getTitle(), s.getProperties().getSheetId());
                    }
                }
            } catch (Exception ex) {
                log.warn("Structural sheet updates error for {}: {}", spreadsheetId, ex.getMessage());
            }
        }

        // Write Tab Data Values in a single batch update
        List<ValueRange> valueRanges = new ArrayList<>();
        for (TabSyncData tab : tabDataList) {
            List<List<Object>> allValues = new ArrayList<>();

            if (tab.isOverview) {
                allValues.add(List.of(googleDriveService.getSpreadsheetPrefix() + " - DASHBOARD SYNCHRONIZATION (READ-ONLY)"));
                allValues.add(List.of("Last Synced: " + LocalDateTime.now().format(DATE_TIME_FORMATTER) + " | Status: Active Sync Engine"));
            }

            allValues.add(new ArrayList<>(tab.headers));
            for (List<Object> row : tab.rows) {
                List<Object> safeRow = new ArrayList<>();
                for (Object cell : row) {
                    safeRow.add(cell != null ? cell : "");
                }
                allValues.add(safeRow);
            }

            // Clear old data on synced tabs first (to ensure clean sheet state)
            try {
                sheets.spreadsheets().values().clear(spreadsheetId, tab.title + "!A1:ZZ", new ClearValuesRequest()).execute();
            } catch (Exception ignored) {}

            valueRanges.add(new ValueRange()
                    .setRange(tab.title + "!A1")
                    .setValues(allValues));
        }

        sheets.spreadsheets().values().batchUpdate(
                spreadsheetId,
                new BatchUpdateValuesRequest()
                        .setValueInputOption("USER_ENTERED")
                        .setData(valueRanges)
                        .setIncludeValuesInResponse(false)
        ).execute();

        // Apply Stylized Formatting, Borders, Zebra Rows, Auto-Resize, and Sheet Protection in a single batch
        List<Request> formattingRequests = new ArrayList<>();
        String serviceEmail = getServiceAccountEmail();

        for (TabSyncData tab : tabDataList) {
            Integer sheetId = titleToSheetId.get(tab.title);
            if (sheetId == null) continue;

            int headerRowIndex = tab.isOverview ? 2 : 0;
            int dataStartRowIndex = headerRowIndex + 1;
            int dataRowCount = tab.rows.size();
            int totalColCount = tab.headers.size();

            // 1. Grid Properties (Frozen Header)
            formattingRequests.add(new Request().setUpdateSheetProperties(
                    new UpdateSheetPropertiesRequest()
                            .setProperties(new SheetProperties()
                                    .setSheetId(sheetId)
                                    .setGridProperties(new GridProperties()
                                            .setFrozenRowCount(tab.isOverview ? 3 : 1)
                                            .setHideGridlines(false)))
                            .setFields("gridProperties.frozenRowCount,gridProperties.hideGridlines")
            ));

            // 2. Row Heights
            formattingRequests.add(new Request().setUpdateDimensionProperties(
                    new UpdateDimensionPropertiesRequest()
                            .setRange(new DimensionRange()
                                    .setSheetId(sheetId)
                                    .setDimension("ROWS")
                                    .setStartIndex(headerRowIndex)
                                    .setEndIndex(headerRowIndex + 1))
                            .setProperties(new DimensionProperties().setPixelSize(36))
                            .setFields("pixelSize")
            ));

            if (dataRowCount > 0) {
                formattingRequests.add(new Request().setUpdateDimensionProperties(
                        new UpdateDimensionPropertiesRequest()
                                .setRange(new DimensionRange()
                                        .setSheetId(sheetId)
                                        .setDimension("ROWS")
                                        .setStartIndex(dataStartRowIndex)
                                        .setEndIndex(dataStartRowIndex + dataRowCount))
                                .setProperties(new DimensionProperties().setPixelSize(26))
                                .setFields("pixelSize")
                ));
            }

            // 3. Header Styling
            int endRowIndex = dataStartRowIndex + dataRowCount;
            Color headerColor = getDomainHeaderColor(tab.domain);
            Color zebraOddBgColor = getDomainZebraOddColor(tab.domain);
            formattingRequests.add(new Request().setRepeatCell(
                    new RepeatCellRequest()
                            .setRange(new GridRange()
                                    .setSheetId(sheetId)
                                    .setStartRowIndex(headerRowIndex)
                                    .setEndRowIndex(headerRowIndex + 1)
                                    .setStartColumnIndex(0)
                                    .setEndColumnIndex(totalColCount))
                            .setCell(new CellData().setUserEnteredFormat(new CellFormat()
                                    .setBackgroundColor(headerColor)
                                    .setTextFormat(new TextFormat()
                                            .setFontFamily("Roboto")
                                            .setFontSize(10)
                                            .setBold(true)
                                            .setForegroundColor(new Color().setRed(1.0f).setGreen(1.0f).setBlue(1.0f)))
                                    .setHorizontalAlignment("CENTER")
                                    .setVerticalAlignment("MIDDLE")
                                    .setBorders(new Borders()
                                            .setBottom(new Border().setStyle("SOLID_MEDIUM").setColor(new Color().setRed(0.8f).setGreen(0.8f).setBlue(0.8f))))
                            ))
                            .setFields("userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)")
            ));

            // Overview Header Banner (Rows 0-1)
            if (tab.isOverview) {
                formattingRequests.add(new Request().setRepeatCell(
                        new RepeatCellRequest()
                                .setRange(new GridRange()
                                        .setSheetId(sheetId)
                                        .setStartRowIndex(0)
                                        .setEndRowIndex(2)
                                        .setStartColumnIndex(0)
                                        .setEndColumnIndex(totalColCount))
                                .setCell(new CellData().setUserEnteredFormat(new CellFormat()
                                        .setBackgroundColor(new Color().setRed(0.0863f).setGreen(0.1294f).setBlue(0.2431f)) // Slate Navy
                                        .setTextFormat(new TextFormat()
                                                .setFontFamily("Roboto")
                                                .setFontSize(11)
                                                .setBold(true)
                                                .setForegroundColor(new Color().setRed(1.0f).setGreen(1.0f).setBlue(1.0f)))
                                        .setVerticalAlignment("MIDDLE")
                                ))
                                .setFields("userEnteredFormat(backgroundColor,textFormat,verticalAlignment)")
                ));
            }

            // 4. Format Data Rows (Subtle Font, Crisp Padding, Alternating Zebra Striping)
            if (dataRowCount > 0) {
                formattingRequests.add(new Request().setRepeatCell(
                        new RepeatCellRequest()
                                .setRange(new GridRange()
                                        .setSheetId(sheetId)
                                        .setStartRowIndex(dataStartRowIndex)
                                        .setEndRowIndex(endRowIndex)
                                        .setStartColumnIndex(0)
                                        .setEndColumnIndex(totalColCount))
                                .setCell(new CellData().setUserEnteredFormat(new CellFormat()
                                        .setBackgroundColor(new Color().setRed(1.0f).setGreen(1.0f).setBlue(1.0f))
                                        .setTextFormat(new TextFormat()
                                                .setFontSize(9)
                                                .setFontFamily("Roboto")
                                                .setForegroundColor(new Color().setRed(0.06f).setGreen(0.09f).setBlue(0.16f)))
                                        .setVerticalAlignment("MIDDLE")
                                        .setPadding(new Padding().setTop(4).setBottom(4).setLeft(8).setRight(8))
                                ))
                                .setFields("userEnteredFormat(backgroundColor,textFormat,verticalAlignment,padding)")
                ));

                for (int r = 0; r < dataRowCount; r++) {
                    if (r % 2 == 1) {
                        formattingRequests.add(new Request().setRepeatCell(
                                new RepeatCellRequest()
                                        .setRange(new GridRange()
                                                .setSheetId(sheetId)
                                                .setStartRowIndex(dataStartRowIndex + r)
                                                .setEndRowIndex(dataStartRowIndex + r + 1)
                                                .setStartColumnIndex(0)
                                                .setEndColumnIndex(totalColCount))
                                        .setCell(new CellData().setUserEnteredFormat(new CellFormat()
                                                .setBackgroundColor(zebraOddBgColor)
                                        ))
                                        .setFields("userEnteredFormat.backgroundColor")
                        ));
                    }
                }
            }

            // 5. THICK BORDERS & STRUCTURAL FRAMING
            Border outerBorder = new Border()
                    .setStyle("SOLID_MEDIUM")
                    .setColor(new Color().setRed(0.2f).setGreen(0.2549f).setBlue(0.3333f));

            Border thickHeaderBottomBorder = new Border()
                    .setStyle("SOLID_THICK")
                    .setColor(new Color().setRed(0.06f).setGreen(0.09f).setBlue(0.16f));

            Border innerLightBorder = new Border()
                    .setStyle("SOLID")
                    .setColor(new Color().setRed(0.85f).setGreen(0.88f).setBlue(0.92f));

            formattingRequests.add(new Request().setUpdateBorders(
                    new UpdateBordersRequest()
                            .setRange(new GridRange()
                                    .setSheetId(sheetId)
                                    .setStartRowIndex(headerRowIndex)
                                    .setEndRowIndex(endRowIndex)
                                    .setStartColumnIndex(0)
                                    .setEndColumnIndex(totalColCount))
                            .setTop(outerBorder)
                            .setBottom(outerBorder)
                            .setLeft(outerBorder)
                            .setRight(outerBorder)
                            .setInnerHorizontal(innerLightBorder)
                            .setInnerVertical(innerLightBorder)
            ));

            formattingRequests.add(new Request().setUpdateBorders(
                    new UpdateBordersRequest()
                            .setRange(new GridRange()
                                    .setSheetId(sheetId)
                                    .setStartRowIndex(headerRowIndex)
                                    .setEndRowIndex(headerRowIndex + 1)
                                    .setStartColumnIndex(0)
                                    .setEndColumnIndex(totalColCount))
                            .setBottom(thickHeaderBottomBorder)
            ));

            if (tab.isOverview && dataRowCount >= 6) {
                Border doubleBorder = new Border()
                        .setStyle("DOUBLE")
                        .setColor(new Color().setRed(0.06f).setGreen(0.09f).setBlue(0.16f));

                formattingRequests.add(new Request().setUpdateBorders(
                        new UpdateBordersRequest()
                                .setRange(new GridRange()
                                        .setSheetId(sheetId)
                                        .setStartRowIndex(headerRowIndex + 6)
                                        .setEndRowIndex(headerRowIndex + 7)
                                        .setStartColumnIndex(0)
                                        .setEndColumnIndex(totalColCount))
                                .setBottom(doubleBorder)
                ));

                formattingRequests.add(new Request().setRepeatCell(
                        new RepeatCellRequest()
                                .setRange(new GridRange()
                                        .setSheetId(sheetId)
                                        .setStartRowIndex(headerRowIndex + 6)
                                        .setEndRowIndex(headerRowIndex + 7)
                                        .setStartColumnIndex(0)
                                        .setEndColumnIndex(totalColCount))
                                .setCell(new CellData().setUserEnteredFormat(new CellFormat()
                                        .setBackgroundColor(new Color().setRed(0.9412f).setGreen(0.9725f).setBlue(1.0f))
                                        .setTextFormat(new TextFormat().setBold(true))
                                ))
                                .setFields("userEnteredFormat(backgroundColor,textFormat.bold)")
                ));
            }

            // 6. Auto-Resize Columns
            formattingRequests.add(new Request().setAutoResizeDimensions(
                    new AutoResizeDimensionsRequest()
                            .setDimensions(new DimensionRange()
                                    .setSheetId(sheetId)
                                    .setDimension("COLUMNS")
                                    .setStartIndex(0)
                                    .setEndIndex(totalColCount))
            ));

            // 7. Protected Range (Strict Read-Only for Users, Service Account Editable)
            Sheet sheetObj = existingSheetsMap.get(tab.title);
            if (sheetObj != null && sheetObj.getProtectedRanges() != null) {
                for (ProtectedRange pr : sheetObj.getProtectedRanges()) {
                    formattingRequests.add(new Request().setDeleteProtectedRange(
                            new DeleteProtectedRangeRequest().setProtectedRangeId(pr.getProtectedRangeId())
                    ));
                }
            }

            ProtectedRange pr = new ProtectedRange()
                    .setRange(new GridRange().setSheetId(sheetId))
                    .setDescription(googleDriveService.getSpreadsheetPrefix() + " Sync - " + tab.title + " (Read-Only)")
                    .setWarningOnly(false)
                    .setRequestingUserCanEdit(false);

            boolean isValidEmail = serviceEmail != null
                    && serviceEmail.contains("@")
                    && !serviceEmail.endsWith(".apps.googleusercontent.com")
                    && !serviceEmail.contains("googleusercontent.com");

            if (isValidEmail) {
                pr.setEditors(new Editors().setUsers(Collections.singletonList(serviceEmail)));
            }

            formattingRequests.add(new Request().setAddProtectedRange(
                    new AddProtectedRangeRequest().setProtectedRange(pr)
            ));
        }

        if (!formattingRequests.isEmpty()) {
            int batchSize = 60;
            for (int i = 0; i < formattingRequests.size(); i += batchSize) {
                int end = Math.min(i + batchSize, formattingRequests.size());
                sheets.spreadsheets().batchUpdate(
                        spreadsheetId,
                        new BatchUpdateSpreadsheetRequest().setRequests(formattingRequests.subList(i, end))
                ).execute();
            }
        }
    }

    private Color getDomainHeaderColor(String domain) {
        if ("FINANCE".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.0235f).setGreen(0.3059f).setBlue(0.2314f); // Forest Emerald #064E3B
        } else if ("LOGISTICS".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.4706f).setGreen(0.2078f).setBlue(0.0588f); // Warm Amber #78350F
        } else if ("HR".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.2157f).setGreen(0.1882f).setBlue(0.6392f); // Deep Indigo #3730A3
        } else if ("FUNDRAISING".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.0745f).setGreen(0.3059f).setBlue(0.2902f); // Deep Teal #134E4A
        } else if ("LEGAL".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.1176f).setGreen(0.2275f).setBlue(0.5412f); // Royal Blue #1E3A8A
        } else if ("OVERVIEW".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.0588f).setGreen(0.0902f).setBlue(0.1647f); // Deep Dark Slate #0F172A
        } else {
            return new Color().setRed(0.1176f).setGreen(0.1608f).setBlue(0.2314f); // Slate 800 #1E293B
        }
    }

    private Color getDomainZebraOddColor(String domain) {
        if ("FINANCE".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.9412f).setGreen(0.9922f).setBlue(0.9569f); // Emerald tint #F0FDF4
        } else if ("LOGISTICS".equalsIgnoreCase(domain)) {
            return new Color().setRed(1.0f).setGreen(0.9843f).setBlue(0.9216f); // Amber tint #FFFBEB
        } else if ("HR".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.9333f).setGreen(0.9490f).setBlue(1.0f); // Indigo tint #EEF2FF
        } else if ("FUNDRAISING".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.9412f).setGreen(0.9922f).setBlue(0.9804f); // Teal tint #F0FDFA
        } else if ("LEGAL".equalsIgnoreCase(domain)) {
            return new Color().setRed(0.9373f).setGreen(0.9647f).setBlue(1.0f); // Blue tint #EFF6FF
        } else {
            return new Color().setRed(0.9725f).setGreen(0.9804f).setBlue(0.9882f); // Slate tint #F8FAFC
        }
    }

    private boolean isBlank(String s) {
        if (s == null) return true;
        String t = s.trim();
        return t.isEmpty() || (t.startsWith("${") && t.endsWith(":}"));
    }




}
