package com.charityapp.service.marketing;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.charityapp.dto.marketing.MarketingResourceDTO;
import com.charityapp.dto.marketing.MarketingResourcesResponseDTO;
import com.charityapp.service.google.GoogleDriveService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class MarketingService {

    private static final Logger log = LoggerFactory.getLogger(MarketingService.class);
    private final GoogleDriveService googleDriveService;

    public MarketingService(GoogleDriveService googleDriveService) {
        this.googleDriveService = googleDriveService;
    }

    public MarketingResourcesResponseDTO getMarketingResources(String targetFolderId) {
        String rootMarketingFolderId = googleDriveService.getMarketingFolderId();
        String effectiveFolderId = (targetFolderId != null && !targetFolderId.isBlank())
                ? targetFolderId.trim()
                : rootMarketingFolderId;

        String folderUrl = effectiveFolderId != null && !effectiveFolderId.isBlank()
                ? "https://drive.google.com/drive/folders/" + effectiveFolderId
                : null;

        List<MarketingResourceDTO> items = new ArrayList<>();
        if (effectiveFolderId == null || effectiveFolderId.isBlank()) {
            return new MarketingResourcesResponseDTO(effectiveFolderId, folderUrl, items);
        }

        try {
            Drive drive = googleDriveService.getDriveService();
            if (drive == null) {
                return new MarketingResourcesResponseDTO(effectiveFolderId, folderUrl, items);
            }

            String q = "'" + effectiveFolderId + "' in parents and trashed = false";
            FileList result = drive.files().list()
                    .setQ(q)
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setFields("files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, modifiedTime)")
                    .setOrderBy("folder, modifiedTime desc")
                    .setPageSize(100)
                    .execute();

            if (result.getFiles() != null) {
                for (File file : result.getFiles()) {
                    boolean isFolder = "application/vnd.google-apps.folder".equals(file.getMimeType());
                    String webView = file.getWebViewLink();
                    if (webView == null || webView.isBlank()) {
                        webView = isFolder
                                ? "https://drive.google.com/drive/folders/" + file.getId()
                                : "https://drive.google.com/file/d/" + file.getId() + "/view";
                    }
                    String webContent = file.getWebContentLink();
                    if (webContent == null || webContent.isBlank()) {
                        webContent = "https://drive.google.com/uc?export=download&id=" + file.getId();
                    }
                    String thumb = file.getThumbnailLink();
                    String modTime = file.getModifiedTime() != null ? file.getModifiedTime().toStringRfc3339() : null;

                    items.add(new MarketingResourceDTO(
                            file.getId(),
                            file.getName(),
                            file.getMimeType(),
                            file.getSize(),
                            webView,
                            webContent,
                            thumb,
                            modTime,
                            isFolder
                    ));
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch marketing resources from Google Drive folder [{}]: {}", effectiveFolderId, e.getMessage(), e);
        }

        return new MarketingResourcesResponseDTO(effectiveFolderId, folderUrl, items);
    }

    public static class DownloadedFile {
        private final byte[] bytes;
        private final String mimeType;
        private final String fileName;

        public DownloadedFile(byte[] bytes, String mimeType, String fileName) {
            this.bytes = bytes;
            this.mimeType = mimeType;
            this.fileName = fileName;
        }

        public byte[] getBytes() { return bytes; }
        public String getMimeType() { return mimeType; }
        public String getFileName() { return fileName; }
    }

    public DownloadedFile downloadFile(String fileId) throws Exception {
        Drive drive = googleDriveService.getDriveService();
        if (drive == null) {
            throw new IllegalStateException("Google Drive service is not configured.");
        }

        File metadata = drive.files().get(fileId)
                .setSupportsAllDrives(true)
                .setFields("id, name, mimeType, size")
                .execute();

        if (metadata == null) {
            return null;
        }

        String mime = metadata.getMimeType();
        String name = metadata.getName();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        if (mime != null && mime.startsWith("application/vnd.google-apps.")) {
            // Google Workspace doc export
            String exportMime = "application/pdf";
            if (mime.contains("spreadsheet")) {
                exportMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                if (!name.endsWith(".xlsx")) name += ".xlsx";
            } else if (mime.contains("presentation")) {
                exportMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                if (!name.endsWith(".pptx")) name += ".pptx";
            } else {
                if (!name.endsWith(".pdf")) name += ".pdf";
            }
            drive.files().export(fileId, exportMime).executeMediaAndDownloadTo(baos);
            mime = exportMime;
        } else {
            drive.files().get(fileId).setSupportsAllDrives(true).executeMediaAndDownloadTo(baos);
        }

        return new DownloadedFile(baos.toByteArray(), mime, name);
    }
}
