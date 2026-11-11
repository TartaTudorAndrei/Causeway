package com.charityapp.controller.marketing;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.marketing.MarketingResourcesResponseDTO;
import com.charityapp.service.marketing.MarketingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/admin/marketing")
public class MarketingController {

    private static final Logger log = LoggerFactory.getLogger(MarketingController.class);
    private final MarketingService marketingService;

    public MarketingController(MarketingService marketingService) {
        this.marketingService = marketingService;
    }

    @GetMapping("/resources")
    @RequirePermission(code = "marketing:resources:read", anyOf = {"marketing:read", "marketing:resources:view"})
    public ResponseEntity<MarketingResourcesResponseDTO> getMarketingResources(@RequestParam(required = false) String folderId) {
        try {
            return ResponseEntity.ok(marketingService.getMarketingResources(folderId));
        } catch (Exception e) {
            log.error("Failed to fetch marketing resources: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/resources/{fileId}/download")
    @RequirePermission(code = "marketing:resources:export", anyOf = {"marketing:resources:read", "marketing:read", "marketing:resources:view"})
    public ResponseEntity<byte[]> downloadResource(@PathVariable String fileId) {
        try {
            MarketingService.DownloadedFile file = marketingService.downloadFile(fileId);
            if (file == null || file.getBytes() == null) {
                return ResponseEntity.notFound().build();
            }

            String encodedFileName = URLEncoder.encode(file.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");
            MediaType mediaType;
            try {
                mediaType = MediaType.parseMediaType(file.getMimeType());
            } catch (Exception ex) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(file.getBytes());
        } catch (Exception e) {
            log.error("Failed to download file {}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/resources/{fileId}/preview")
    @RequirePermission(code = "marketing:resources:read", anyOf = {"marketing:read", "marketing:resources:view"})
    public ResponseEntity<byte[]> previewResource(@PathVariable String fileId) {
        try {
            MarketingService.DownloadedFile file = marketingService.downloadFile(fileId);
            if (file == null || file.getBytes() == null) {
                return ResponseEntity.notFound().build();
            }

            MediaType mediaType;
            try {
                mediaType = MediaType.parseMediaType(file.getMimeType());
            } catch (Exception ex) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }

            String encodedFileName = URLEncoder.encode(file.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(file.getBytes());
        } catch (Exception e) {
            log.error("Failed to preview file {}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
