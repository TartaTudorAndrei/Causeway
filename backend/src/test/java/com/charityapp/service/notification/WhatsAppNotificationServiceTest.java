package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.finance.FinanceStand;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@ExtendWith(MockitoExtension.class)
class WhatsAppNotificationServiceTest {

    private WhatsAppNotificationService whatsAppService;
    private AppConfigProperties properties;

    @BeforeEach
    void setUp() {
        properties = new AppConfigProperties();
        properties.getWhatsapp().setEnabled(true);
        properties.getWhatsapp().setServiceUrl("http://localhost:3001");
        properties.getWhatsapp().setInternalSecret("app_internal_secret");
        properties.getWhatsapp().getGroup().setAdmin("123456@g.us");
        properties.getWhatsapp().getGroup().setFinance("123456@g.us");
        properties.getWhatsapp().getGroup().setLogistics("123456@g.us");
        properties.getWhatsapp().getGroup().setHr("123456@g.us");

        whatsAppService = new WhatsAppNotificationService(properties, null, null, null, null);
    }

    @Test
    void testVolunteerApprovalNotificationDoesNotThrow() {
        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, com.charityapp.model.auth.AdminRole.VOLUNTEER);
        user.setPhone("0712345678");

        assertDoesNotThrow(() -> whatsAppService.sendVolunteerApprovalNotification(user));
    }

    @Test
    void testVolunteerWelcomeNotificationDoesNotThrow() {
        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.PENDING_APPROVAL, com.charityapp.model.auth.AdminRole.VOLUNTEER);
        user.setPhone("0712345678");

        assertDoesNotThrow(() -> whatsAppService.sendVolunteerWelcomeNotification(user));
    }

    @Test
    void testVolunteerWelcomeNotificationDispatchesWhenRuleConfigured() {
        com.charityapp.service.general.NotificationRuleService mockRuleService = org.mockito.Mockito.mock(com.charityapp.service.general.NotificationRuleService.class);
        com.charityapp.model.general.NotificationRule rule = new com.charityapp.model.general.NotificationRule();
        rule.setChannel("WHATSAPP");
        rule.setRuleType("VOLUNTEER_WELCOME");
        rule.setName("Welcome Rule");
        rule.setCategory("HR");
        rule.setActive(true);
        rule.setTargetRecipientType("VOLUNTEER_DIRECT");
        rule.setTemplates("[\"Salut {firstName}\"]");

        org.mockito.Mockito.when(mockRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "VOLUNTEER_WELCOME"))
                .thenReturn(java.util.List.of(rule));
        org.mockito.Mockito.when(mockRuleService.renderRandomTemplate(org.mockito.ArgumentMatchers.eq(rule), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn(java.util.Optional.of("Salut Ion"));

        WhatsAppNotificationService serviceWithMock = new WhatsAppNotificationService(properties, null, null, mockRuleService, null);

        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.PENDING_APPROVAL, com.charityapp.model.auth.AdminRole.VOLUNTEER);
        user.setPhone("0712345678");
        user.setWhatsappNotificationsEnabled(true);

        assertDoesNotThrow(() -> serviceWithMock.sendVolunteerWelcomeNotification(user));

        org.mockito.Mockito.verify(mockRuleService).renderRandomTemplate(org.mockito.ArgumentMatchers.eq(rule), org.mockito.ArgumentMatchers.argThat(map ->
                "Ion".equals(map.get("firstName")) && "Ion Popescu".equals(map.get("fullName"))
        ));
    }

    @Test
    void testNoRulesConfiguredDoesNotDispatchAnyMessages() {
        com.charityapp.service.general.NotificationRuleService mockRuleService = org.mockito.Mockito.mock(com.charityapp.service.general.NotificationRuleService.class);
        org.mockito.Mockito.when(mockRuleService.findByChannelAndRuleTypeAndActiveTrue(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(java.util.List.of());

        WhatsAppNotificationService serviceWithMock = new WhatsAppNotificationService(properties, null, null, mockRuleService, null);

        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, com.charityapp.model.auth.AdminRole.VOLUNTEER);
        user.setPhone("0712345678");
        user.setWhatsappNotificationsEnabled(true);

        // When no rules configured, none of these should send messages or throw
        assertDoesNotThrow(() -> serviceWithMock.sendVolunteerApprovalNotification(user));
        assertDoesNotThrow(() -> serviceWithMock.sendVolunteerWelcomeNotification(user));
        assertDoesNotThrow(() -> serviceWithMock.sendLogisticsLowStockAlert("Item", 2, 10, "buc", "Stand"));
        assertDoesNotThrow(() -> serviceWithMock.sendLogisticsEoDCompletionAlert("Stand", "Ion", "Note", 10));
        assertDoesNotThrow(() -> serviceWithMock.sendHrLowVolunteerCapacityAlert("Tura", "2026-09-20", "10:00", "14:00", 1, 3, "Stand"));
        assertDoesNotThrow(() -> serviceWithMock.triggerUpcomingShiftReminders());

        com.charityapp.model.general.GeneralTask task = new com.charityapp.model.general.GeneralTask();
        task.setId(UUID.randomUUID());
        task.setTitle("Test Task");
        assertDoesNotThrow(() -> serviceWithMock.sendTaskNotification(task, "0712345678", false, 0, 0));
    }

    @Test
    void testStandEoDDoubleCompletionAlertDoesNotThrow() {
        FinanceStand stand = new FinanceStand(
                "Stand Piata Unirii",
                LocalDate.now(),
                "Tura 1",
                UUID.randomUUID(),
                "Maria Casier",
                new BigDecimal("500.00"),
                new BigDecimal("250.00"),
                new BigDecimal("50.00"),
                new BigDecimal("800.00"),
                BigDecimal.ZERO,
                null,
                "SUBMITTED"
        );

        assertDoesNotThrow(() -> whatsAppService.sendStandEoDDoubleCompletionAlert(stand));
    }

    @Test
    void testLogisticsLowStockAlertDoesNotThrow() {
        assertDoesNotThrow(() -> whatsAppService.sendLogisticsLowStockAlert("Item 2026", 5, 20, "buc", "Stand Central"));
    }

    @Test
    void testLogisticsEoDCompletionAlertDoesNotThrow() {
        assertDoesNotThrow(() -> whatsAppService.sendLogisticsEoDCompletionAlert("Stand Central", "Ion Popescu", "Toate bune", 45));
    }

    @Test
    void testHrLowVolunteerCapacityAlertDoesNotThrow() {
        assertDoesNotThrow(() -> whatsAppService.sendHrLowVolunteerCapacityAlert("Tura 1", "2026-08-30", "10:00", "14:00", 1, 4, "Stand Unirii"));
    }

    @Test
    void testTaskAssignedNotificationDoesNotThrow() {
        com.charityapp.model.general.GeneralTask task = new com.charityapp.model.general.GeneralTask(
                UUID.randomUUID(),
                "Amenajare Stand Central",
                "Aducere materiale din depozit",
                "logistics",
                "high",
                "todo",
                "Ion Popescu, Maria Ionescu",
                "2026-12-01",
                "admin@test.ro"
        );
        assertDoesNotThrow(() -> whatsAppService.sendTaskAssignedNotification(task));
    }

    @Test
    void testSendManualNotificationDirectDoesNotThrow() {
        assertDoesNotThrow(() -> whatsAppService.sendManualNotification("DIRECT", "0712345678", null, "Mesaj manual"));
    }

    @Test
    void testSendManualNotificationGroupDoesNotThrow() {
        assertDoesNotThrow(() -> whatsAppService.sendManualNotification("WHATSAPP_GROUP", "123456@g.us", null, "Mesaj manual grup"));
    }

    @Test
    void testGetAvailableRolesReturnsRoles() {
        org.junit.jupiter.api.Assertions.assertFalse(whatsAppService.getAvailableRoles().isEmpty());
    }

    @Test
    void testGroupParticipantJoinedDispatchesToTriggerGroupWhenMatchingRuleActive() {
        com.charityapp.service.general.NotificationRuleService mockRuleService = org.mockito.Mockito.mock(com.charityapp.service.general.NotificationRuleService.class);
        com.charityapp.model.general.NotificationRule rule = new com.charityapp.model.general.NotificationRule();
        rule.setChannel("WHATSAPP");
        rule.setRuleType("GROUP_MEMBER_JOIN");
        rule.setName("Group Join Rule");
        rule.setCategory("GENERAL");
        rule.setActive(true);
        rule.setSourceGroupJid("123456@g.us");
        rule.setTargetRecipientType("TRIGGER_GROUP");
        rule.setTemplates("[\"Bun venit în {groupName}, {userName}!\"]");

        org.mockito.Mockito.when(mockRuleService.findAllActiveByRuleType("GROUP_MEMBER_JOIN"))
                .thenReturn(java.util.List.of(rule));
        org.mockito.Mockito.when(mockRuleService.renderRandomTemplate(org.mockito.ArgumentMatchers.eq(rule), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn(java.util.Optional.of("Bun venit în Voluntari, 0712345678!"));

        WhatsAppNotificationService serviceWithMock = new WhatsAppNotificationService(properties, null, null, mockRuleService, null);

        assertDoesNotThrow(() -> serviceWithMock.handleGroupParticipantJoined("123456@g.us", "Voluntari", "40712345678@s.whatsapp.net"));

        org.mockito.Mockito.verify(mockRuleService).renderRandomTemplate(org.mockito.ArgumentMatchers.eq(rule), org.mockito.ArgumentMatchers.argThat(map ->
                "Voluntari".equals(map.get("groupName")) && map.containsKey("participantPhone")
        ));
    }

    @Test
    void testGroupParticipantJoinedDispatchesToJoinedUserDirect() {
        com.charityapp.service.general.NotificationRuleService mockRuleService = org.mockito.Mockito.mock(com.charityapp.service.general.NotificationRuleService.class);
        com.charityapp.model.general.NotificationRule rule = new com.charityapp.model.general.NotificationRule();
        rule.setChannel("WHATSAPP");
        rule.setRuleType("GROUP_MEMBER_JOIN");
        rule.setName("Private Welcome");
        rule.setCategory("GENERAL");
        rule.setActive(true);
        rule.setSourceGroupJid(null); // All groups
        rule.setTargetRecipientType("JOINED_USER_DIRECT");
        rule.setTemplates("[\"Salut direct!\"]");

        org.mockito.Mockito.when(mockRuleService.findAllActiveByRuleType("GROUP_MEMBER_JOIN"))
                .thenReturn(java.util.List.of(rule));
        org.mockito.Mockito.when(mockRuleService.renderRandomTemplate(org.mockito.ArgumentMatchers.eq(rule), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn(java.util.Optional.of("Salut direct!"));

        WhatsAppNotificationService serviceWithMock = new WhatsAppNotificationService(properties, null, null, mockRuleService, null);

        assertDoesNotThrow(() -> serviceWithMock.handleGroupParticipantJoined("any_group@g.us", "Echipa", "40799999999@s.whatsapp.net"));

        org.mockito.Mockito.verify(mockRuleService).renderRandomTemplate(org.mockito.ArgumentMatchers.eq(rule), org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void testGroupParticipantJoinedSkipsWhenSourceGroupMismatch() {
        com.charityapp.service.general.NotificationRuleService mockRuleService = org.mockito.Mockito.mock(com.charityapp.service.general.NotificationRuleService.class);
        com.charityapp.model.general.NotificationRule rule = new com.charityapp.model.general.NotificationRule();
        rule.setChannel("WHATSAPP");
        rule.setRuleType("GROUP_MEMBER_JOIN");
        rule.setName("Specific Group Rule");
        rule.setCategory("GENERAL");
        rule.setActive(true);
        rule.setSourceGroupJid("specific_group@g.us");
        rule.setTargetRecipientType("TRIGGER_GROUP");

        org.mockito.Mockito.when(mockRuleService.findAllActiveByRuleType("GROUP_MEMBER_JOIN"))
                .thenReturn(java.util.List.of(rule));

        WhatsAppNotificationService serviceWithMock = new WhatsAppNotificationService(properties, null, null, mockRuleService, null);

        // Event for a different group
        assertDoesNotThrow(() -> serviceWithMock.handleGroupParticipantJoined("different_group@g.us", "Alt Grup", "40711111111@s.whatsapp.net"));

        // Template rendering should never be called because group mismatched
        org.mockito.Mockito.verify(mockRuleService, org.mockito.Mockito.never()).renderRandomTemplate(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void testGroupParticipantJoinedNoActiveRulesNoDispatch() {
        com.charityapp.service.general.NotificationRuleService mockRuleService = org.mockito.Mockito.mock(com.charityapp.service.general.NotificationRuleService.class);
        org.mockito.Mockito.when(mockRuleService.findAllActiveByRuleType("GROUP_MEMBER_JOIN"))
                .thenReturn(java.util.List.of());

        WhatsAppNotificationService serviceWithMock = new WhatsAppNotificationService(properties, null, null, mockRuleService, null);

        assertDoesNotThrow(() -> serviceWithMock.handleGroupParticipantJoined("group@g.us", "Grup", "40712345678@s.whatsapp.net"));
        org.mockito.Mockito.verify(mockRuleService, org.mockito.Mockito.never()).renderRandomTemplate(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
