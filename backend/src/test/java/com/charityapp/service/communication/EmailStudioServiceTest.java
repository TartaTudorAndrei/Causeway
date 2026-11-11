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
import com.charityapp.service.communication.EmailStudioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailStudioServiceTest {

    @Mock
    private EmailRepository emailRepository;

    @Mock
    private AdminEmailService adminEmailService;

    private EmailStudioService emailStudioService;

    @BeforeEach
    void setUp() {
        emailStudioService = new EmailStudioService(emailRepository, adminEmailService);
    }

    @Test
    void testCreateTemplate() {
        EmailTemplateRequest req = new EmailTemplateRequest();
        req.setName("Sponsor Gold");
        req.setDepartment("fundraising");
        req.setSubject("Parteneriat 2026");
        req.setBlocks("[{\"type\":\"header\",\"title\":\"Charity\"}]");

        UUID userId = UUID.randomUUID();
        when(emailRepository.saveTemplate(any(EmailTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailTemplate created = emailStudioService.createTemplate(req, userId);

        assertNotNull(created);
        assertEquals("Sponsor Gold", created.getName());
        assertEquals("fundraising", created.getDepartment());
        assertEquals(userId, created.getCreatedBy());
        verify(emailRepository).saveTemplate(any(EmailTemplate.class));
    }

    @Test
    void testDispatchEmailSuccess() {
        EmailDispatchRequest req = new EmailDispatchRequest();
        req.setRecipientEmail("sponsor@acme.com");
        req.setRecipientName("Acme SRL");
        req.setSubject("Parteneriat");
        req.setHtmlContent("<html><body>Test Content</body></html>");

        UUID userId = UUID.randomUUID();
        when(emailRepository.saveLog(any(EmailLog.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailLog log = emailStudioService.dispatchEmail(req, userId);

        assertNotNull(log);
        assertEquals("sponsor@acme.com", log.getRecipientEmail());
        assertEquals("API", log.getDispatchMethod());
        assertEquals("SENT", log.getStatus());
        assertEquals(userId, log.getSentBy());

        verify(adminEmailService).sendEmail("sponsor@acme.com", "Parteneriat", "<html><body>Test Content</body></html>");
        verify(emailRepository).saveLog(any(EmailLog.class));
    }

    @Test
    void testRecordLogForManualExport() {
        EmailLogRequest req = new EmailLogRequest();
        req.setRecipientEmail("lead@acme.ro");
        req.setRecipientName("Ion Popescu");
        req.setSubject("Invitatie");
        req.setDispatchMethod("EML_DOWNLOAD");

        UUID userId = UUID.randomUUID();
        when(emailRepository.saveLog(any(EmailLog.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailLog log = emailStudioService.recordLog(req, userId);

        assertNotNull(log);
        assertEquals("EML_DOWNLOAD", log.getDispatchMethod());
        assertEquals("SENT", log.getStatus());
        verify(emailRepository).saveLog(any(EmailLog.class));
    }

    @Test
    void testGetTemplatesFilter() {
        when(emailRepository.findAllTemplates("fundraising")).thenReturn(List.of(new EmailTemplate()));
        List<EmailTemplate> result = emailStudioService.getTemplates("fundraising");
        assertEquals(1, result.size());
        verify(emailRepository).findAllTemplates("fundraising");
    }

    @Test
    void testSaveEmailImage(@org.junit.jupiter.api.io.TempDir java.nio.file.Path tempDir) throws Exception {
        emailStudioService.setEmailImagesDir(tempDir.toString());
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file",
                "test-banner.png",
                "image/png",
                "fake-image-bytes".getBytes()
        );

        String savedName = emailStudioService.saveEmailImage(file);
        assertNotNull(savedName);
        assertTrue(savedName.endsWith(".png"));
        assertTrue(java.nio.file.Files.exists(tempDir.resolve(savedName)));
    }

    @Test
    void testGenerateCopyNameGoogleDriveStyle() {
        // 1. First copy of a template
        String copy1 = emailStudioService.generateCopyName("Sponsor Gold", List.of("Sponsor Gold", "Newsletter"));
        assertEquals("Copy of Sponsor Gold", copy1);

        // 2. Second copy when "Copy of Sponsor Gold" already exists
        String copy2 = emailStudioService.generateCopyName("Sponsor Gold", List.of("Sponsor Gold", "Copy of Sponsor Gold"));
        assertEquals("Copy of Sponsor Gold (2)", copy2);

        // 3. Third copy when index 2 already exists
        String copy3 = emailStudioService.generateCopyName("Sponsor Gold", List.of("Sponsor Gold", "Copy of Sponsor Gold", "Copy of Sponsor Gold (2)"));
        assertEquals("Copy of Sponsor Gold (3)", copy3);

        // 4. Copying an already-copied template directly
        String copyOfCopy = emailStudioService.generateCopyName("Copy of Sponsor Gold (2)", List.of("Sponsor Gold", "Copy of Sponsor Gold", "Copy of Sponsor Gold (2)"));
        assertEquals("Copy of Sponsor Gold (3)", copyOfCopy);

        // 5. Handling gaps in copy numbers
        String copyGap = emailStudioService.generateCopyName("Newsletter", List.of("Newsletter", "Copy of Newsletter", "Copy of Newsletter (4)"));
        assertEquals("Copy of Newsletter (5)", copyGap);

        // 6. Romanian prefix support
        String copyRo1 = emailStudioService.generateCopyName("Copie după Invitație", List.of("Copie după Invitație"));
        assertEquals("Copie după Invitație (2)", copyRo1);

        // 7. Null or blank fallback
        String copyBlank = emailStudioService.generateCopyName("", List.of());
        assertEquals("Copy of Untitled Template", copyBlank);
    }

    @Test
    void testCopyTemplateSuccess() {
        UUID sourceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        EmailTemplate source = new EmailTemplate();
        source.setId(sourceId);
        source.setName("Campanie Paste");
        source.setDepartment("fundraising");
        source.setSubject("Invitatie Generala");
        source.setBlocks("[{\"type\":\"text\",\"content\":\"Salut\"}]");

        when(emailRepository.findTemplateById(sourceId)).thenReturn(Optional.of(source));
        when(emailRepository.findAllTemplates(null)).thenReturn(List.of(source));
        when(emailRepository.saveTemplate(any(EmailTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailTemplate copied = emailStudioService.copyTemplate(sourceId, userId);

        assertNotNull(copied);
        assertEquals("Copy of Campanie Paste", copied.getName());
        assertEquals("fundraising", copied.getDepartment());
        assertEquals("Invitatie Generala", copied.getSubject());
        assertEquals("[{\"type\":\"text\",\"content\":\"Salut\"}]", copied.getBlocks());
        assertEquals(userId, copied.getCreatedBy());

        verify(emailRepository).findTemplateById(sourceId);
        verify(emailRepository).saveTemplate(any(EmailTemplate.class));
    }
}
