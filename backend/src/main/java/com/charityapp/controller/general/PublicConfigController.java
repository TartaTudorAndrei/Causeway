package com.charityapp.controller.general;

import com.charityapp.config.TenantProperties;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/public")
public class PublicConfigController {

    private final TenantProperties tenantProperties;

    public PublicConfigController(TenantProperties tenantProperties) {
        this.tenantProperties = tenantProperties;
    }

    @GetMapping("/config")
    public ResponseEntity<TenantProperties> getPublicConfig() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .body(tenantProperties);
    }
}
