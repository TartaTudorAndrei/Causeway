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
import com.charityapp.dto.config.ConfigItemDTO;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.general.SystemConfig;
import com.charityapp.model.general.SystemConfigSnapshot;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.admin.AuditLogRepository;
import com.charityapp.repository.general.SystemConfigRepository;
import com.charityapp.service.general.ConfigEncryptionService;
import com.charityapp.service.general.DynamicConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class DynamicConfigServiceTest {

    private SystemConfigRepository repository;
    private ConfigEncryptionService encryptionService;
    private TenantProperties tenantProperties;
    private AppConfigProperties appConfigProperties;
    private AdminUserRepository userRepository;
    private AuditLogRepository auditLogRepository;
    private PasswordHasher passwordHasher;
    private ApplicationEventPublisher eventPublisher;
    private ObjectMapper objectMapper;

    private DynamicConfigService dynamicConfigService;

    private final UUID testUserId = UUID.randomUUID();
    private AdminUser testUser;

    @BeforeEach
    void setUp() {
        repository = mock(SystemConfigRepository.class);
        encryptionService = new ConfigEncryptionService("master_test_key_32_bytes_long_12345", "fallback");
        tenantProperties = new TenantProperties();
        appConfigProperties = new AppConfigProperties();
        userRepository = mock(AdminUserRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        passwordHasher = new PasswordHasher();
        eventPublisher = mock(ApplicationEventPublisher.class);
        objectMapper = new ObjectMapper();

        testUser = new AdminUser("Admin User", "admin@test.com", passwordHasher.hash("ValidPass123!"), AdminStatus.APPROVED, "ADMIN");
        testUser.setId(testUserId);
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

        dynamicConfigService = new DynamicConfigService(
                repository,
                encryptionService,
                tenantProperties,
                appConfigProperties,
                userRepository,
                auditLogRepository,
                passwordHasher,
                eventPublisher,
                objectMapper
        );
        dynamicConfigService.setUiConfigEnabled(true);
    }

    @Test
    void testGetAllConfigsReturnsMaskedSecrets() {
        SystemConfig plain = new SystemConfig("APP_TENANT_NAME", "BRANDING", "My Charity", "STRING", false, false, "Nume", "Name");
        SystemConfig secret = new SystemConfig("STRIPE_SECRET_KEY", "INTEGRATIONS", null, "STRING", true, false, "Stripe", "Stripe");
        secret.setEncryptedValue(encryptionService.encrypt("sk_live_secret"));

        when(repository.findAll()).thenReturn(List.of(plain, secret));

        List<ConfigItemDTO> result = dynamicConfigService.getAllConfigs();
        assertEquals(2, result.size());

        ConfigItemDTO plainDto = result.stream().filter(c -> c.getKey().equals("APP_TENANT_NAME")).findFirst().orElseThrow();
        assertEquals("My Charity", plainDto.getValue());
        assertFalse(plainDto.isSecret());
        assertTrue(plainDto.isConfigured());

        ConfigItemDTO secretDto = result.stream().filter(c -> c.getKey().equals("STRIPE_SECRET_KEY")).findFirst().orElseThrow();
        assertEquals("••••••••••••••••••••", secretDto.getValue());
        assertTrue(secretDto.isSecret());
        assertTrue(secretDto.isConfigured());
    }

    @Test
    void testRevealSecretWithValidPassword() {
        SystemConfig secret = new SystemConfig("STRIPE_SECRET_KEY", "INTEGRATIONS", null, "STRING", true, false, "Stripe", "Stripe");
        String plaintextSecret = "sk_test_actual_secret_value";
        secret.setEncryptedValue(encryptionService.encrypt(plaintextSecret));
        when(repository.findByKey("STRIPE_SECRET_KEY")).thenReturn(Optional.of(secret));

        String revealed = dynamicConfigService.revealSecret("STRIPE_SECRET_KEY", testUserId, "ValidPass123!", null);
        assertEquals(plaintextSecret, revealed);
    }

    @Test
    void testRevealSecretThrowsOnInvalidPassword() {
        SystemConfig secret = new SystemConfig("STRIPE_SECRET_KEY", "INTEGRATIONS", null, "STRING", true, false, "Stripe", "Stripe");
        secret.setEncryptedValue(encryptionService.encrypt("sk_test_val"));
        when(repository.findByKey("STRIPE_SECRET_KEY")).thenReturn(Optional.of(secret));

        assertThrows(ResponseStatusException.class, () ->
                dynamicConfigService.revealSecret("STRIPE_SECRET_KEY", testUserId, "WrongPassword!", null)
        );
    }

    @Test
    void testUpdateConfigsAppliesToRuntimeAndEncryptsSecrets() {
        SystemConfig plain = new SystemConfig("APP_TENANT_NAME", "BRANDING", "Old Name", "STRING", false, false, "Nume", "Name");
        SystemConfig secret = new SystemConfig("STRIPE_SECRET_KEY", "INTEGRATIONS", null, "STRING", true, false, "Stripe", "Stripe");
        when(repository.findByKey("APP_TENANT_NAME")).thenReturn(Optional.of(plain));
        when(repository.findByKey("STRIPE_SECRET_KEY")).thenReturn(Optional.of(secret));

        Map<String, String> updates = Map.of(
                "APP_TENANT_NAME", "New Dynamic Charity Name",
                "STRIPE_SECRET_KEY", "sk_test_new_value"
        );

        Map<String, Object> result = dynamicConfigService.updateConfigs(
                updates,
                testUserId,
                "ValidPass123!",
                null,
                "127.0.0.1",
                "TestAgent"
        );

        assertEquals(2, result.get("keysUpdated"));

        // Verify runtime in-memory updates
        assertEquals("New Dynamic Charity Name", tenantProperties.getIdentity().getName());
        assertEquals("sk_test_new_value", appConfigProperties.getStripe().getSecretKey());

        // Verify repository was called to update value
        verify(repository, times(1)).updateValue(eq("APP_TENANT_NAME"), eq("New Dynamic Charity Name"), isNull(), eq(testUserId));

        ArgumentCaptor<String> cipherCaptor = ArgumentCaptor.forClass(String.class);
        verify(repository, times(1)).updateValue(eq("STRIPE_SECRET_KEY"), isNull(), cipherCaptor.capture(), eq(testUserId));
        assertNotNull(cipherCaptor.getValue());
        assertEquals("sk_test_new_value", encryptionService.decrypt(cipherCaptor.getValue()));

        // Verify event was published
        verify(eventPublisher, times(1)).publishEvent(any(com.charityapp.event.ConfigUpdatedEvent.class));
    }

    @Test
    void testKernelPropertyTriggersRestartRequired() {
        SystemConfig kernelPort = new SystemConfig("PORT", "KERNEL", "8080", "NUMBER", false, true, "Port", "Port");
        when(repository.findByKey("PORT")).thenReturn(Optional.of(kernelPort));

        assertFalse(dynamicConfigService.isRestartRequired());

        Map<String, Object> result = dynamicConfigService.updateConfigs(
                Map.of("PORT", "9090"),
                testUserId,
                null,
                null,
                "127.0.0.1",
                "Agent"
        );

        assertTrue((Boolean) result.get("restartRequired"));
        assertTrue(dynamicConfigService.isRestartRequired());

        dynamicConfigService.acknowledgeRestart(testUserId);
        assertFalse(dynamicConfigService.isRestartRequired());
    }

    @Test
    void testUiConfigDisabledBlocksMutationsAndHydration() {
        dynamicConfigService.setUiConfigEnabled(false);
        assertFalse(dynamicConfigService.isUiConfigEnabled());

        // init() should not query repository
        dynamicConfigService.init();
        verify(repository, never()).findAll();

        // revealSecret should throw 403 Forbidden
        assertThrows(ResponseStatusException.class, () ->
                dynamicConfigService.revealSecret("STRIPE_SECRET_KEY", testUserId, "ValidPass123!", null)
        );

        // updateConfigs should throw 403 Forbidden
        assertThrows(ResponseStatusException.class, () ->
                dynamicConfigService.updateConfigs(Map.of("APP_TENANT_NAME", "New"), testUserId, "ValidPass123!", null, "127.0.0.1", "Agent")
        );
    }
}
