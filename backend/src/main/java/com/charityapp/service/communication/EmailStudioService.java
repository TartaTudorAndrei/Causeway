package com.charityapp.service.communication;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.communication.EmailDispatchRequest;
import com.charityapp.dto.communication.EmailLogRequest;
import com.charityapp.dto.communication.EmailTemplateRequest;
import com.charityapp.model.communication.EmailLog;
import com.charityapp.model.communication.EmailTemplate;
import com.charityapp.repository.communication.EmailRepository;
import com.charityapp.service.notification.AdminEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class EmailStudioService {

    private static final Logger log = LoggerFactory.getLogger(EmailStudioService.class);
    private final EmailRepository emailRepository;
    private final AdminEmailService adminEmailService;

    @Value("${app.uploads.email-images.dir:uploads/email-images}")
    private String emailImagesDir;

    public EmailStudioService(EmailRepository emailRepository, AdminEmailService adminEmailService) {
        this.emailRepository = emailRepository;
        this.adminEmailService = adminEmailService;
    }

    public void setEmailImagesDir(String emailImagesDir) {
        this.emailImagesDir = emailImagesDir;
    }

    public List<EmailTemplate> getTemplates(String department) {
        return emailRepository.findAllTemplates(department);
    }

    public EmailTemplate getTemplateById(UUID id) {
        return emailRepository.findTemplateById(id).orElse(null);
    }

    public EmailTemplate createTemplate(EmailTemplateRequest req, UUID userId) {
        EmailTemplate template = new EmailTemplate();
        template.setName(req.getName());
        template.setDepartment(req.getDepartment() != null ? req.getDepartment() : "fundraising");
        template.setSubject(req.getSubject());
        template.setBlocks(req.getBlocks() != null ? req.getBlocks() : "[]");
        template.setCreatedBy(userId);
        return emailRepository.saveTemplate(template);
    }

    public EmailTemplate updateTemplate(UUID id, EmailTemplateRequest req) {
        EmailTemplate template = emailRepository.findTemplateById(id)
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + id));
        template.setName(req.getName());
        if (req.getDepartment() != null) template.setDepartment(req.getDepartment());
        template.setSubject(req.getSubject());
        if (req.getBlocks() != null) template.setBlocks(req.getBlocks());
        return emailRepository.updateTemplate(id, template);
    }

    public boolean deleteTemplate(UUID id) {
        return emailRepository.deleteTemplate(id);
    }

    public EmailTemplate copyTemplate(UUID sourceId, UUID userId) {
        return copyTemplate(sourceId, userId, null);
    }

    public EmailTemplate copyTemplate(UUID sourceId, UUID userId, String customName) {
        EmailTemplate source = emailRepository.findTemplateById(sourceId).orElse(null);
        if (source == null) return null;

        String newName;
        if (customName != null && !customName.trim().isBlank()) {
            newName = customName.trim();
        } else {
            List<EmailTemplate> allTemplates = emailRepository.findAllTemplates(null);
            List<String> existingNames = allTemplates.stream()
                    .map(EmailTemplate::getName)
                    .filter(java.util.Objects::nonNull)
                    .toList();
            newName = generateCopyName(source.getName(), existingNames);
        }

        EmailTemplate copy = new EmailTemplate();
        copy.setName(newName);
        copy.setDepartment(source.getDepartment());
        copy.setSubject(source.getSubject());
        copy.setBlocks(source.getBlocks());
        copy.setCreatedBy(userId);

        return emailRepository.saveTemplate(copy);
    }

    public String generateCopyName(String originalName, List<String> existingNames) {
        if (originalName == null || originalName.isBlank()) {
            originalName = "Untitled Template";
        }
        originalName = originalName.trim();

        Pattern copyPattern = Pattern.compile("^(?:Copy of|Copie după|Copie a)\\s+(.*?)(?:\\s+\\((\\d+)\\))?$", Pattern.CASE_INSENSITIVE);
        Matcher matcher = copyPattern.matcher(originalName);

        String baseName;
        String prefix = "Copy of ";
        if (matcher.matches()) {
            baseName = matcher.group(1).trim();
            if (originalName.toLowerCase().startsWith("copie după")) {
                prefix = "Copie după ";
            } else if (originalName.toLowerCase().startsWith("copie a")) {
                prefix = "Copie a ";
            }
        } else {
            baseName = originalName;
        }

        Pattern familyPattern = Pattern.compile("^(?:Copy of|Copie după|Copie a)\\s+" + Pattern.quote(baseName) + "(?:\\s+\\((\\d+)\\))?$", Pattern.CASE_INSENSITIVE);

        boolean baseCopyExists = false;
        int maxIndex = 1;

        if (existingNames != null) {
            for (String name : existingNames) {
                if (name == null) continue;
                String trimmed = name.trim();
                Matcher m = familyPattern.matcher(trimmed);
                if (m.matches()) {
                    baseCopyExists = true;
                    String idxStr = m.group(1);
                    if (idxStr != null && !idxStr.isBlank()) {
                        try {
                            int idx = Integer.parseInt(idxStr);
                            if (idx > maxIndex) {
                                maxIndex = idx;
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        if (!baseCopyExists) {
            return prefix + baseName;
        } else {
            return prefix + baseName + " (" + (maxIndex + 1) + ")";
        }
    }

    public EmailLog dispatchEmail(EmailDispatchRequest req, UUID userId) {
        if (req.getRecipientEmail() == null || req.getRecipientEmail().isBlank()) {
            throw new IllegalArgumentException("Recipient email is required");
        }
        if (req.getSubject() == null || req.getSubject().isBlank()) {
            throw new IllegalArgumentException("Email subject is required");
        }
        if (req.getHtmlContent() == null || req.getHtmlContent().isBlank()) {
            throw new IllegalArgumentException("HTML content is required for email dispatch");
        }

        String status = "SENT";
        try {
            adminEmailService.sendEmail(req.getRecipientEmail(), req.getSubject(), req.getHtmlContent());
        } catch (Exception e) {
            log.error("Failed to trigger email dispatch to {}: {}", req.getRecipientEmail(), e.getMessage());
            status = "FAILED";
        }

        EmailLog logEntry = new EmailLog(
                UUID.randomUUID(),
                req.getTemplateId(),
                req.getRecipientEmail(),
                req.getRecipientName(),
                req.getSubject(),
                "API",
                status,
                userId
        );

        return emailRepository.saveLog(logEntry);
    }

    public EmailLog recordLog(EmailLogRequest req, UUID userId) {
        String method = req.getDispatchMethod() != null ? req.getDispatchMethod() : "API";
        String status = req.getStatus() != null ? req.getStatus() : "SENT";

        EmailLog logEntry = new EmailLog(
                UUID.randomUUID(),
                req.getTemplateId(),
                req.getRecipientEmail() != null ? req.getRecipientEmail() : "",
                req.getRecipientName(),
                req.getSubject() != null ? req.getSubject() : "",
                method,
                status,
                userId
        );

        return emailRepository.saveLog(logEntry);
    }

    public List<EmailLog> getRecentLogs(int limit) {
        return emailRepository.findRecentLogs(limit);
    }

    public String saveEmailImage(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(emailImagesDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }
        if (extension.isBlank() || extension.length() > 5) {
            String contentType = file.getContentType();
            if ("image/png".equalsIgnoreCase(contentType)) extension = ".png";
            else if ("image/webp".equalsIgnoreCase(contentType)) extension = ".webp";
            else if ("image/gif".equalsIgnoreCase(contentType)) extension = ".gif";
            else if ("image/svg+xml".equalsIgnoreCase(contentType)) extension = ".svg";
            else extension = ".jpg";
        }

        String filename = UUID.randomUUID() + extension;
        Path targetLocation = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        log.info("Saved email template image: {} (size: {} bytes)", filename, file.getSize());
        return filename;
    }
}
