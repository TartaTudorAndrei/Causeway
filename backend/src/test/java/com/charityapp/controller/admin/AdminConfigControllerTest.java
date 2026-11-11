package com.charityapp.controller.admin;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.config.ConfigBatchUpdateRequest;
import com.charityapp.dto.config.ConfigItemDTO;
import com.charityapp.dto.config.ConfigRevealRequest;
import com.charityapp.dto.config.ConfigStatusResponse;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.general.DynamicConfigService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class AdminConfigControllerTest {

    private DynamicConfigService configService;
    private JwtService jwtService;
    private HttpServletRequest request;
    private AdminConfigController controller;

    private final UUID testUserId = UUID.randomUUID();
    private final String testToken = "test.jwt.token";

    @BeforeEach
    void setUp() {
        configService = mock(DynamicConfigService.class);
        jwtService = mock(JwtService.class);
        request = mock(HttpServletRequest.class);

        controller = new AdminConfigController(configService, jwtService);

        when(request.getHeader("Authorization")).thenReturn("Bearer " + testToken);
        when(jwtService.extractUserId(testToken)).thenReturn(testUserId);
    }

    @Test
    void testGetStatus() {
        when(configService.isUiConfigEnabled()).thenReturn(true);
        when(configService.isRestartRequired()).thenReturn(false);
        when(configService.getAllConfigs()).thenReturn(List.of(new ConfigItemDTO()));

        ResponseEntity<ConfigStatusResponse> res = controller.getStatus();
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertNotNull(res.getBody());
        assertTrue(res.getBody().isUiConfigEnabled());
        assertFalse(res.getBody().isRestartRequired());
        assertEquals(1, res.getBody().getTotalConfigs());
    }

    @Test
    void testGetAllConfigs() {
        when(configService.isUiConfigEnabled()).thenReturn(true);
        ConfigItemDTO item = new ConfigItemDTO("APP_TENANT_NAME", "BRANDING", "Charity", "STRING", false, true, false, "Nume", "Name", LocalDateTime.now());
        when(configService.getAllConfigs()).thenReturn(List.of(item));

        ResponseEntity<List<ConfigItemDTO>> res = controller.getAllConfigs();
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().size());
        assertEquals("APP_TENANT_NAME", res.getBody().get(0).getKey());
    }

    @Test
    void testUpdateBatch() {
        Map<String, String> values = Map.of("APP_TENANT_NAME", "Updated Name");
        ConfigBatchUpdateRequest reqDto = new ConfigBatchUpdateRequest(values, "pass", null);

        when(configService.updateConfigs(eq(values), eq(testUserId), eq("pass"), isNull(), any(), any()))
                .thenReturn(Map.of("keysUpdated", 1, "restartRequired", false));

        ResponseEntity<Map<String, Object>> res = controller.updateBatch(reqDto, request);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().get("keysUpdated"));
        assertEquals(false, res.getBody().get("restartRequired"));
    }

    @Test
    void testRevealSecret() {
        ConfigRevealRequest reqDto = new ConfigRevealRequest("STRIPE_SECRET_KEY", "mypass", null);
        when(configService.revealSecret("STRIPE_SECRET_KEY", testUserId, "mypass", null))
                .thenReturn("sk_live_revealed");

        ResponseEntity<Map<String, String>> res = controller.revealSecret(reqDto, request);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals("sk_live_revealed", res.getBody().get("value"));
    }

    @Test
    void testAcknowledgeRestart() {
        ResponseEntity<Map<String, Object>> res = controller.acknowledgeRestart(request);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        verify(configService).acknowledgeRestart(testUserId);
        assertEquals(false, res.getBody().get("restartRequired"));
    }
}
