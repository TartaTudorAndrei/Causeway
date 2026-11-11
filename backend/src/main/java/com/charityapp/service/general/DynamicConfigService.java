package com.charityapp.service.general;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.config.TenantProperties;
import com.charityapp.dto.config.*;
import com.charityapp.event.ConfigUpdatedEvent;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.ScopeType;
import com.charityapp.model.general.SystemConfig;
import com.charityapp.model.general.SystemConfigSnapshot;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.repository.general.SystemConfigRepository;
import com.charityapp.service.security.PasswordHasher;
import com.charityapp.util.TotpUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.Stripe;
import com.stripe.model.Balance;
import com.stripe.net.RequestOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class DynamicConfigService {

    private static final Logger log = LoggerFactory.getLogger(DynamicConfigService.class);

    private final SystemConfigRepository repository;
    private final ConfigEncryptionService encryptionService;
    private final TenantProperties tenantProperties;
    private final AppConfigProperties appConfigProperties;
    private final AdminUserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordHasher passwordHasher;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Value("${app.ui-config.enabled:false}")
    private boolean uiConfigEnabled = false;

    @Value("${app.sync-to-env-file:false}")
    private boolean syncToEnvFile;

    private final AtomicBoolean restartRequired = new AtomicBoolean(false);

    public DynamicConfigService(SystemConfigRepository repository,
                                ConfigEncryptionService encryptionService,
                                TenantProperties tenantProperties,
                                AppConfigProperties appConfigProperties,
                                AdminUserRepository userRepository,
                                AuditLogRepository auditLogRepository,
                                PasswordHasher passwordHasher,
                                ApplicationEventPublisher eventPublisher,
                                ObjectMapper objectMapper) {
        this.repository = repository;
        this.encryptionService = encryptionService;
        this.tenantProperties = tenantProperties;
        this.appConfigProperties = appConfigProperties;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordHasher = passwordHasher;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    public boolean isUiConfigEnabled() {
        return uiConfigEnabled;
    }

    public void setUiConfigEnabled(boolean uiConfigEnabled) {
        this.uiConfigEnabled = uiConfigEnabled;
    }

    public boolean isRestartRequired() {
        return restartRequired.get();
    }

    public void acknowledgeRestart(UUID actorId) {
        restartRequired.set(false);
        recordAudit(actorId, "SYSTEM_RESTART_ACKNOWLEDGED", "SYSTEM", null, "S-a confirmat solicitarea de repornire kernel.", null, null);
    }

    @PostConstruct
    public void init() {
        if (!uiConfigEnabled) {
            log.info("UI Dynamic Configuration is disabled by static host bootstrap (APP_UI_CONFIG_ENABLED=false).");
            return;
        }

        try {
            log.info("Hydrating runtime properties from general.system_configurations database overrides...");
            List<SystemConfig> configs = repository.findAll();
            int appliedCount = 0;
            for (SystemConfig config : configs) {
                String val = resolveEffectiveValue(config);
                if (val != null && !val.isBlank()) {
                    applyToRuntime(config.getConfigKey(), val);
                    appliedCount++;
                }
            }
            log.info("Dynamic configuration hydrated successfully: {} overrides applied.", appliedCount);
        } catch (Exception e) {
            log.warn("Could not hydrate dynamic configuration from database (may be first bootstrap): {}", e.getMessage());
        }
    }

    public List<ConfigItemDTO> getAllConfigs() {
        List<SystemConfig> configs = repository.findAll();
        List<ConfigItemDTO> dtoList = new ArrayList<>();

        for (SystemConfig c : configs) {
            boolean isConfigured = false;
            String displayVal = "";

            if (c.isSecret()) {
                isConfigured = (c.getEncryptedValue() != null && !c.getEncryptedValue().isBlank())
                        || (c.getConfigValue() != null && !c.getConfigValue().isBlank());
                displayVal = isConfigured ? encryptionService.maskSecret("configured") : "";
            } else {
                displayVal = c.getConfigValue() != null ? c.getConfigValue() : "";
                isConfigured = !displayVal.isBlank();
            }

            dtoList.add(new ConfigItemDTO(
                    c.getConfigKey(),
                    c.getCategory(),
                    displayVal,
                    c.getDataType(),
                    c.isSecret(),
                    isConfigured,
                    c.isRequiresRestart(),
                    c.getDescriptionRo(),
                    c.getDescriptionEn(),
                    c.getUpdatedAt()
            ));
        }

        return dtoList;
    }

    public String revealSecret(String configKey, UUID actorId, String password, String totpCode) {
        validateUiConfigAllowed();
        validateStepUp(actorId, password, totpCode);

        SystemConfig config = repository.findByKey(configKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cheia de configurare nu există: " + configKey));

        if (!config.isSecret()) {
            return config.getConfigValue();
        }

        String decrypted = null;
        if (config.getEncryptedValue() != null && !config.getEncryptedValue().isBlank()) {
            decrypted = encryptionService.decrypt(config.getEncryptedValue());
        } else if (config.getConfigValue() != null && !config.getConfigValue().isBlank()) {
            decrypted = config.getConfigValue();
        }

        recordAudit(actorId, "CONFIG_SECRET_REVEALED", "SYSTEM_CONFIG", configKey,
                "A fost dezvăluită valoarea secretă pentru: " + configKey, null, null);

        return decrypted != null ? decrypted : "";
    }

    @Transactional
    public Map<String, Object> updateConfigs(Map<String, String> updates, UUID actorId,
                                            String password, String totpCode,
                                            String clientIp, String userAgent) {
        validateUiConfigAllowed();
        if (updates == null || updates.isEmpty()) {
            return Map.of("keysUpdated", 0, "restartRequired", restartRequired.get());
        }

        // Check if any updated key is a secret or requires step-up
        boolean includesSecret = false;
        for (String key : updates.keySet()) {
            Optional<SystemConfig> existing = repository.findByKey(key);
            if (existing.isPresent() && existing.get().isSecret()) {
                includesSecret = true;
                break;
            }
        }

        if (includesSecret) {
            validateStepUp(actorId, password, totpCode);
        }

        // Create automatic rollback snapshot
        createAutomaticSnapshot(actorId);

        Set<String> touchedKeys = new HashSet<>();
        boolean triggeredRestart = false;

        for (Map.Entry<String, String> entry : updates.entrySet()) {
            String key = entry.getKey();
            String rawNewValue = entry.getValue() != null ? entry.getValue().trim() : "";

            Optional<SystemConfig> opt = repository.findByKey(key);
            if (opt.isEmpty()) {
                continue;
            }

            SystemConfig config = opt.get();
            String oldEffective = resolveEffectiveValue(config);
            String oldFingerprint = encryptionService.computeFingerprint(oldEffective);

            // Skip masked placeholder values if user didn't change secret
            if (config.isSecret() && (rawNewValue.startsWith("••••") || rawNewValue.isBlank())) {
                continue;
            }

            if (Objects.equals(oldEffective, rawNewValue)) {
                continue;
            }

            if (config.isSecret()) {
                String encrypted = encryptionService.encrypt(rawNewValue);
                repository.updateValue(key, null, encrypted, actorId);
            } else {
                repository.updateValue(key, rawNewValue, null, actorId);
            }

            // In-memory runtime apply
            applyToRuntime(key, rawNewValue);
            touchedKeys.add(key);

            if (config.isRequiresRestart()) {
                restartRequired.set(true);
                triggeredRestart = true;
            }

            String newFingerprint = encryptionService.computeFingerprint(rawNewValue);
            recordAudit(actorId, "CONFIG_UPDATED", "SYSTEM_CONFIG", key,
                    "Actualizare configurare: " + key + " [hash " + oldFingerprint + " -> " + newFingerprint + "]",
                    clientIp, userAgent);
        }

        if (!touchedKeys.isEmpty()) {
            eventPublisher.publishEvent(new ConfigUpdatedEvent(this, touchedKeys, actorId, restartRequired.get()));

            if (syncToEnvFile) {
                syncToFile();
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("keysUpdated", touchedKeys.size());
        response.put("restartRequired", restartRequired.get());
        return response;
    }

    public List<ConfigSnapshotDTO> getSnapshots() {
        List<SystemConfigSnapshot> snapshots = repository.findAllSnapshots();
        List<ConfigSnapshotDTO> dtos = new ArrayList<>();
        for (SystemConfigSnapshot s : snapshots) {
            int count = 0;
            try {
                Map<String, Object> map = objectMapper.readValue(s.getConfigPayload(), new TypeReference<>() {});
                count = map.size();
            } catch (Exception ignored) {}

            dtos.add(new ConfigSnapshotDTO(
                    s.getId(),
                    s.getSnapshotLabel(),
                    s.getCreatedAt(),
                    s.getCreatedBy(),
                    count
            ));
        }
        return dtos;
    }

    public void createManualSnapshot(String label, UUID actorId) {
        validateUiConfigAllowed();
        createSnapshotWithLabel(label != null && !label.isBlank() ? label : "Snapshot manual - " + LocalDateTime.now(), actorId);
    }

    @Transactional
    public void rollbackToSnapshot(UUID snapshotId, UUID actorId, String password, String totpCode) {
        validateUiConfigAllowed();
        validateStepUp(actorId, password, totpCode);

        SystemConfigSnapshot snapshot = repository.findSnapshotById(snapshotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Snapshot-ul nu a fost găsit."));

        try {
            Map<String, Map<String, Object>> map = objectMapper.readValue(snapshot.getConfigPayload(), new TypeReference<>() {});
            Set<String> restoredKeys = new HashSet<>();

            for (Map.Entry<String, Map<String, Object>> entry : map.entrySet()) {
                String key = entry.getKey();
                Map<String, Object> itemData = entry.getValue();

                String configValue = (String) itemData.get("configValue");
                String encryptedValue = (String) itemData.get("encryptedValue");

                repository.updateValue(key, configValue, encryptedValue, actorId);

                Optional<SystemConfig> updatedOpt = repository.findByKey(key);
                if (updatedOpt.isPresent()) {
                    String eff = resolveEffectiveValue(updatedOpt.get());
                    applyToRuntime(key, eff);
                }
                restoredKeys.add(key);
            }

            recordAudit(actorId, "CONFIG_SNAPSHOT_ROLLBACK", "SYSTEM_CONFIG", snapshotId.toString(),
                    "Revenire configurare la snapshot: " + snapshot.getSnapshotLabel(), null, null);

            eventPublisher.publishEvent(new ConfigUpdatedEvent(this, restoredKeys, actorId, restartRequired.get()));
        } catch (Exception e) {
            log.error("Failed to restore configuration snapshot: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Eroare la restaurarea snapshot-ului: " + e.getMessage());
        }
    }

    // Connection testing
    public TestConnectionResponse testStripeConnection(String customKey) {
        String keyToTest = (customKey != null && !customKey.isBlank())
                ? customKey
                : appConfigProperties.getStripe().getSecretKey();

        if (keyToTest == null || keyToTest.isBlank()) {
            return TestConnectionResponse.fail("Cheia secretă Stripe nu este configurată.");
        }

        try {
            RequestOptions options = RequestOptions.builder().setApiKey(keyToTest).build();
            Balance balance = Balance.retrieve(options);
            boolean isLive = balance.getLivemode() != null && balance.getLivemode();
            return TestConnectionResponse.ok(
                    "Conexiune Stripe reușită (" + (isLive ? "Mod Live" : "Mod Test") + ")",
                    "Disponibil: " + balance.getAvailable().size() + " monede active"
            );
        } catch (Exception e) {
            return TestConnectionResponse.fail("Verificare Stripe eșuată: " + e.getMessage());
        }
    }

    public TestConnectionResponse testEmailConnection(String host, Integer port, String username, String password, String targetEmail) {
        String effHost = (host != null && !host.isBlank()) ? host : "smtp.gmail.com";
        int effPort = (port != null && port > 0) ? port : 587;
        String effUser = username != null ? username : "";
        String effPass = password != null ? password : "";

        if (effUser.isBlank() || effPass.isBlank()) {
            // Fallback to currently configured
            Optional<SystemConfig> passConfig = repository.findByKey("SPRING_MAIL_PASSWORD");
            if (passConfig.isPresent()) {
                effPass = resolveEffectiveValue(passConfig.get());
            }
            Optional<SystemConfig> userConfig = repository.findByKey("SPRING_MAIL_USERNAME");
            if (userConfig.isPresent() && userConfig.get().getConfigValue() != null) {
                effUser = userConfig.get().getConfigValue();
            }
        }

        if (effUser.isBlank() || effPass == null || effPass.isBlank()) {
            return TestConnectionResponse.fail("Credențialele SMTP (utilizator/parolă) sunt incomplete.");
        }

        try {
            Properties props = new Properties();
            props.put("mail.smtp.host", effHost);
            props.put("mail.smtp.port", String.valueOf(effPort));
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.connectiontimeout", "5000");
            props.put("mail.smtp.timeout", "5000");

            Session session = Session.getInstance(props);
            try (Transport transport = session.getTransport("smtp")) {
                transport.connect(effHost, effPort, effUser, effPass);
            }
            return TestConnectionResponse.ok("Conexiune server SMTP verificată cu succes.");
        } catch (Exception e) {
            return TestConnectionResponse.fail("Conexiune SMTP eșuată: " + e.getMessage());
        }
    }

    public TestConnectionResponse testGeminiConnection(String apiKey, String model) {
        String effKey = (apiKey != null && !apiKey.isBlank()) ? apiKey : appConfigProperties.getGemini().getApiKey();
        if (effKey == null || effKey.isBlank()) {
            Optional<SystemConfig> geminiConfig = repository.findByKey("GEMINI_API_KEY");
            if (geminiConfig.isPresent()) {
                effKey = resolveEffectiveValue(geminiConfig.get());
            }
        }

        if (effKey == null || effKey.isBlank()) {
            return TestConnectionResponse.fail("Cheia API Gemini nu este configurată.");
        }

        String effModel = (model != null && !model.isBlank()) ? model : "gemini-3.7-flash";
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
            String uri = "https://generativelanguage.googleapis.com/v1beta/models/" + effModel + "?key=" + effKey;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(uri))
                    .GET()
                    .timeout(Duration.ofSeconds(6))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return TestConnectionResponse.ok("API Gemini validat (" + effModel + ")");
            } else {
                return TestConnectionResponse.fail("Răspuns Gemini HTTP " + response.statusCode(), response.body());
            }
        } catch (Exception e) {
            return TestConnectionResponse.fail("Eroare la apelul Gemini API: " + e.getMessage());
        }
    }

    // Helper methods
    private void validateUiConfigAllowed() {
        if (!uiConfigEnabled) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "UI_CONFIGURATION_LOCKED_BY_HOST: Modificările prin interfață sunt dezactivate pe acest host.");
        }
    }

    private void validateStepUp(UUID actorId, String password, String totpCode) {
        AdminUser user = userRepository.findById(actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilizator inexistent."));

        boolean verified = false;

        if (password != null && !password.isBlank()) {
            if (passwordHasher.verify(password, user.getPasswordHash())) {
                verified = true;
            }
        }

        if (!verified && totpCode != null && !totpCode.isBlank() && user.getTwoFactorSecret() != null) {
            if (TotpUtil.verifyCode(user.getTwoFactorSecret(), totpCode)) {
                verified = true;
            }
        }

        if (!verified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentificare suplimentară necesară (Parolă sau cod 2FA invalid).");
        }
    }

    private String resolveEffectiveValue(SystemConfig config) {
        if (config.isSecret()) {
            if (config.getEncryptedValue() != null && !config.getEncryptedValue().isBlank()) {
                return encryptionService.decrypt(config.getEncryptedValue());
            }
            return config.getConfigValue();
        }
        return config.getConfigValue();
    }

    private void applyToRuntime(String key, String val) {
        if (val == null) return;

        switch (key) {
            // BRANDING
            case "APP_TENANT_NAME" -> tenantProperties.getIdentity().setName(val);
            case "APP_TENANT_SHORTHAND" -> tenantProperties.getIdentity().setShorthand(val);
            case "APP_TENANT_TAGLINE" -> tenantProperties.getIdentity().setTagline(val);
            case "APP_TENANT_DESCRIPTION" -> tenantProperties.getIdentity().setDescription(val);
            case "APP_TENANT_MISSION_STATEMENT" -> tenantProperties.getIdentity().setMissionStatement(val);
            case "APP_LOGO_URL" -> tenantProperties.getTheme().getAssets().setLogoUrl(val);
            case "APP_LOGO_LIGHT_URL" -> tenantProperties.getTheme().getAssets().setLogoLightUrl(val);
            case "APP_LOGO_DARK_URL" -> tenantProperties.getTheme().getAssets().setLogoDarkUrl(val);
            case "APP_FAVICON_URL" -> tenantProperties.getTheme().getAssets().setFaviconUrl(val);

            // THEME
            case "APP_BRAND_COLOR_PRIMARY" -> tenantProperties.getTheme().getBrandColors().setPrimary(val);
            case "APP_BRAND_COLOR_SECONDARY" -> tenantProperties.getTheme().getBrandColors().setSecondary(val);
            case "APP_BRAND_COLOR_ACCENT" -> tenantProperties.getTheme().getBrandColors().setAccent(val);
            case "APP_BRAND_COLOR_CREAM" -> tenantProperties.getTheme().getBrandColors().setCream(val);
            case "APP_BRAND_COLOR_CHARCOAL" -> tenantProperties.getTheme().getBrandColors().setCharcoal(val);
            case "APP_BORDER_RADIUS" -> tenantProperties.getTheme().getStyling().setBorderRadius(val);

            // INTEGRATIONS
            case "STRIPE_SECRET_KEY" -> {
                appConfigProperties.getStripe().setSecretKey(val);
                Stripe.apiKey = val;
            }
            case "STRIPE_WEBHOOK_SECRET" -> appConfigProperties.getStripe().setWebhookSecret(val);
            case "APP_STRIPE_DESCRIPTOR" -> tenantProperties.getIntegrations().setStripeStatementDescriptor(val);
            case "GEMINI_API_KEY" -> appConfigProperties.getGemini().setApiKey(val);
            case "GEMINI_MODEL" -> appConfigProperties.getGemini().setModel(val);
            case "APP_PICKUP_CODE_PREFIX" -> tenantProperties.getIntegrations().setPickupCodePrefix(val);
            case "APP_GOOGLE_SHEETS_PREFIX" -> tenantProperties.getIntegrations().setGoogleSheetsPrefix(val);
            case "APP_GOOGLE_SHEETS_MASTER_TITLE" -> tenantProperties.getIntegrations().setGoogleSheetsMasterTitle(val);
            case "APP_GOOGLE_DRIVE_FOLDER_NAME" -> tenantProperties.getIntegrations().setGoogleDriveFolderName(val);
            case "WHATSAPP_ENABLED" -> appConfigProperties.getWhatsapp().setEnabled(Boolean.parseBoolean(val));
            case "WHATSAPP_SERVICE_URL" -> appConfigProperties.getWhatsapp().setServiceUrl(val);
            case "WHATSAPP_INTERNAL_SECRET" -> appConfigProperties.getWhatsapp().setInternalSecret(val);

            // EMAIL
            case "APP_EMAIL_SENDER_NAME" -> tenantProperties.getIntegrations().setEmailSenderName(val);
            case "APP_EMAIL_SENDER_ADDRESS" -> tenantProperties.getIntegrations().setEmailSenderAddress(val);
            case "CHARITY_EMAIL_FROM" -> appConfigProperties.getCharity().getEmail().setFrom(val);
            case "RESEND_API_KEY" -> appConfigProperties.getResend().setApiKey(val);
            case "RESEND_FROM_EMAIL" -> appConfigProperties.getResend().setFromEmail(val);
            case "RESEND_FROM_NAME" -> appConfigProperties.getResend().setFromName(val);

            // SECURITY
            case "APP_TOTP_ISSUER" -> tenantProperties.getIntegrations().setTotpIssuer(val);

            // BUSINESS
            case "APP_LOCATION_CITY" -> tenantProperties.getLocation().setCity(val);
            case "APP_LOCATION_COUNTY" -> tenantProperties.getLocation().setCounty(val);
            case "APP_LOCATION_COUNTRY" -> tenantProperties.getLocation().setCountry(val);
            case "APP_LOCATION_TIMEZONE" -> tenantProperties.getLocation().setTimezone(val);
            case "APP_DEFAULT_CURRENCY" -> appConfigProperties.getApp().getDefaultConfig().setCurrency(val);
            case "APP_PICKUP_THRESHOLD" -> {
                try {
                    appConfigProperties.getApp().getPickupCode().setThreshold(Double.parseDouble(val));
                } catch (NumberFormatException ignored) {}
            }
            case "APP_SEASON_NAME" -> tenantProperties.getTerminology().setCampaignSeasonName(val);
            default -> {}
        }
    }

    private void createAutomaticSnapshot(UUID actorId) {
        createSnapshotWithLabel("Snapshot automat - " + LocalDateTime.now(), actorId);
    }

    private void createSnapshotWithLabel(String label, UUID actorId) {
        try {
            List<SystemConfig> current = repository.findAll();
            Map<String, Map<String, Object>> snapshotMap = new HashMap<>();
            for (SystemConfig c : current) {
                Map<String, Object> item = new HashMap<>();
                item.put("configValue", c.getConfigValue());
                item.put("encryptedValue", c.getEncryptedValue());
                item.put("dataType", c.getDataType());
                item.put("isSecret", c.isSecret());
                snapshotMap.put(c.getConfigKey(), item);
            }
            String json = objectMapper.writeValueAsString(snapshotMap);
            repository.saveSnapshot(new SystemConfigSnapshot(null, label, json, actorId));
        } catch (Exception e) {
            log.warn("Failed to create configuration snapshot: {}", e.getMessage());
        }
    }

    private void syncToFile() {
        try {
            List<SystemConfig> configs = repository.findAll();
            File envFile = new File(".env.runtime");
            try (FileWriter writer = new FileWriter(envFile)) {
                writer.write("# Auto-generated by Dynamic Configuration System\n");
                writer.write("# Generated at: " + LocalDateTime.now() + "\n\n");
                for (SystemConfig c : configs) {
                    String val = resolveEffectiveValue(c);
                    if (val != null) {
                        writer.write(c.getConfigKey() + "=" + val + "\n");
                    }
                }
            }
            log.info("Synced dynamic configuration to {}", envFile.getAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to sync configuration to .env.runtime: {}", e.getMessage());
        }
    }

    private void recordAudit(UUID actorId, String action, String resourceType, String resourceName,
                             String summary, String ip, String ua) {
        try {
            AuditLog log = new AuditLog(
                    actorId,
                    "system@example.org",
                    action,
                    resourceType,
                    null,
                    summary,
                    ip != null ? ip : "127.0.0.1",
                    ua != null ? ua : "System"
            );
            log.setResourceName(resourceName);
            log.setDepartment("IT");
            log.setScopeType(ScopeType.GLOBAL);
            auditLogRepository.save(log);
        } catch (Exception e) {
            log.warn("Failed to record configuration audit log: {}", e.getMessage());
        }
    }
}
