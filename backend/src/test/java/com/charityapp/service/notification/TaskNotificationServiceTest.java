package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.general.GeneralTask;
import com.charityapp.model.general.TaskNotificationLog;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.general.GeneralRepository;
import com.charityapp.repository.general.TaskNotificationLogRepository;
import com.charityapp.service.general.TaskNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskNotificationServiceTest {

    private static final ZoneId ZONE = TaskNotificationService.ZONE_RO;
    private static final Clock FIXED_DAYTIME_CLOCK = Clock.fixed(
            Instant.parse("2026-09-29T10:00:00Z"), // 13:00 Romania time
            ZONE
    );
    private static final Clock FIXED_QUIET_CLOCK = Clock.fixed(
            Instant.parse("2026-09-29T00:00:00Z"), // 03:00 Romania time
            ZONE
    );

    @Mock
    private TaskNotificationLogRepository logRepository;

    @Mock
    private GeneralRepository generalRepository;

    @Mock
    private AdminUserRepository adminUserRepository;

    @Mock
    private WhatsAppNotificationService whatsAppNotificationService;

    @Mock
    private PwaNotificationService pwaNotificationService;

    private TaskNotificationService service;

    @BeforeEach
    void setUp() {
        service = new TaskNotificationService(
                logRepository,
                generalRepository,
                adminUserRepository,
                whatsAppNotificationService,
                pwaNotificationService,
                FIXED_DAYTIME_CLOCK
        );
    }

    @Test
    void testQuietHours() {
        assertTrue(service.isQuietHours(LocalTime.of(23, 0)));
        assertTrue(service.isQuietHours(LocalTime.of(23, 59)));
        assertTrue(service.isQuietHours(LocalTime.of(0, 0)));
        assertTrue(service.isQuietHours(LocalTime.of(4, 30)));
        assertTrue(service.isQuietHours(LocalTime.of(7, 59)));

        assertFalse(service.isQuietHours(LocalTime.of(8, 0)));
        assertFalse(service.isQuietHours(LocalTime.of(12, 0)));
        assertFalse(service.isQuietHours(LocalTime.of(18, 30)));
        assertFalse(service.isQuietHours(LocalTime.of(22, 59)));
    }

    @Test
    void testPriorityReminderCounts() {
        assertEquals(1, service.getReminderCountForPriority("low"));
        assertEquals(1, service.getReminderCountForPriority("scazuta"));
        assertEquals(1, service.getReminderCountForPriority("scăzută"));

        assertEquals(3, service.getReminderCountForPriority("medium"));
        assertEquals(3, service.getReminderCountForPriority("medie"));
        assertEquals(3, service.getReminderCountForPriority(null));
        assertEquals(3, service.getReminderCountForPriority("unknown"));

        assertEquals(5, service.getReminderCountForPriority("high"));
        assertEquals(5, service.getReminderCountForPriority("ridicata"));
        assertEquals(5, service.getReminderCountForPriority("ridicată"));
    }

    @Test
    void testTaskExplicitReminderCount() {
        GeneralTask taskWithCount = new GeneralTask();
        taskWithCount.setReminderCount(4);
        taskWithCount.setPriority("low");
        assertEquals(4, service.getReminderCount(taskWithCount));

        GeneralTask taskZeroCount = new GeneralTask();
        taskZeroCount.setReminderCount(0);
        taskZeroCount.setPriority("high");
        assertEquals(0, service.getReminderCount(taskZeroCount));

        GeneralTask taskNullCount = new GeneralTask();
        taskNullCount.setReminderCount(null);
        taskNullCount.setPriority("high");
        assertEquals(5, service.getReminderCount(taskNullCount));
    }

    @Test
    void testEffectiveReminderCountCap() {
        // 3 days window: 2026-09-01 to 2026-09-04
        LocalDateTime start = LocalDateTime.of(2026, 9, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 9, 4, 23, 59, 59);

        GeneralTask task = new GeneralTask();
        // User requested 10 reminders (> 1 per day for 3 days)
        task.setReminderCount(10);
        assertEquals(3, service.getEffectiveReminderCount(task, start, end));

        // User requested 2 reminders (<= 3 days)
        task.setReminderCount(2);
        assertEquals(2, service.getEffectiveReminderCount(task, start, end));

        // User requested 0 reminders
        task.setReminderCount(0);
        assertEquals(0, service.getEffectiveReminderCount(task, start, end));
    }

    @Test
    void testCheckpointsCalculation() {
        LocalDateTime start = LocalDateTime.of(2026, 9, 1, 10, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 9, 11, 10, 0, 0); // 10 days duration

        // 1 checkpoint exactly at 50% (midpoint = 5 days -> 10:00 AM, outside quiet hours)
        List<LocalDateTime> lowCheckpoints = service.calculateCheckpoints(start, end, 1);
        assertEquals(1, lowCheckpoints.size());
        assertEquals(LocalDateTime.of(2026, 9, 6, 10, 0, 0), lowCheckpoints.get(0));

        // 3 checkpoints at 25%, 50%, 75%
        List<LocalDateTime> medCheckpoints = service.calculateCheckpoints(start, end, 3);
        assertEquals(3, medCheckpoints.size());

        // Checkpoint landing at midnight (quiet hours) gets shifted to 08:30 AM
        LocalDateTime midnightStart = LocalDateTime.of(2026, 9, 1, 0, 0, 0);
        LocalDateTime midnightEnd = LocalDateTime.of(2026, 9, 11, 0, 0, 0);
        List<LocalDateTime> shiftedCheckpoints = service.calculateCheckpoints(midnightStart, midnightEnd, 1);
        assertEquals(1, shiftedCheckpoints.size());
        assertEquals(LocalDateTime.of(2026, 9, 6, 8, 30, 0), shiftedCheckpoints.get(0));

        // 0 reminders -> empty checkpoints
        List<LocalDateTime> zeroCheckpoints = service.calculateCheckpoints(start, end, 0);
        assertTrue(zeroCheckpoints.isEmpty());

        // Invalid window (deadline before creation) -> empty
        List<LocalDateTime> invalidCheckpoints = service.calculateCheckpoints(end, start, 3);
        assertTrue(invalidCheckpoints.isEmpty());
    }

    @Test
    void testStartDateParsing() {
        LocalDateTime parsed = service.parseStartDate("2026-09-20");
        assertNotNull(parsed);
        assertEquals(2026, parsed.getYear());
        assertEquals(9, parsed.getMonthValue());
        assertEquals(20, parsed.getDayOfMonth());
        assertEquals(0, parsed.getHour());
        assertEquals(0, parsed.getMinute());

        assertNull(service.parseStartDate(null));
        assertNull(service.parseStartDate(""));
        assertNull(service.parseStartDate("not-a-date"));
    }

    @Test
    void testDeadlineParsing() {
        LocalDateTime parsedDate = service.parseDeadline("2026-12-25");
        assertNotNull(parsedDate);
        assertEquals(2026, parsedDate.getYear());
        assertEquals(12, parsedDate.getMonthValue());
        assertEquals(25, parsedDate.getDayOfMonth());
        assertEquals(23, parsedDate.getHour());
        assertEquals(59, parsedDate.getMinute());

        assertNull(service.parseDeadline(null));
        assertNull(service.parseDeadline(""));
        assertNull(service.parseDeadline("invalid-date"));
    }

    @Test
    void testResolveRecipientsByAssigneeIds() {
        UUID userId = UUID.randomUUID();
        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);
        user.setPhone("0712345678");

        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(user));

        GeneralTask task = new GeneralTask();
        task.setAssigneeIds(userId.toString());

        List<TaskNotificationService.TaskRecipient> recipients = service.resolveRecipients(task);
        assertEquals(1, recipients.size());
        assertEquals(userId.toString(), recipients.get(0).userId());
        assertEquals("0712345678", recipients.get(0).phone());
    }

    @Test
    void testTaskCreatedOutsideQuietHoursDispatchesAndLogs() {
        UUID userId = UUID.randomUUID();
        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);
        user.setPhone("0712345678");

        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(user));
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndSentDate(any(), anyString(), anyString(), any()))
                .thenReturn(false);

        GeneralTask task = new GeneralTask();
        task.setId(UUID.randomUUID());
        task.setTitle("Test Task");
        task.setAssigneeIds(userId.toString());

        service.onTaskCreated(task);

        verify(whatsAppNotificationService, times(1))
                .sendTaskNotification(eq(task), eq("0712345678"), eq(false), eq(0), eq(0));
        verify(pwaNotificationService, times(1))
                .sendTaskPushNotification(eq(task), eq(userId.toString()), eq(false), eq(0), eq(0));
        verify(logRepository, times(2)).save(any(TaskNotificationLog.class));
    }

    @Test
    void testTaskCreatedDuringQuietHoursDeferred() {
        TaskNotificationService quietService = new TaskNotificationService(
                logRepository,
                generalRepository,
                adminUserRepository,
                whatsAppNotificationService,
                pwaNotificationService,
                FIXED_QUIET_CLOCK
        );

        GeneralTask task = new GeneralTask();
        task.setId(UUID.randomUUID());
        task.setTitle("Overnight Task");
        task.setAssigneeIds(UUID.randomUUID().toString());

        quietService.onTaskCreated(task);

        verifyNoInteractions(whatsAppNotificationService);
        verifyNoInteractions(pwaNotificationService);
        verifyNoInteractions(logRepository);
    }

    @Test
    void testRateLimitingPreventsMultipleNotificationsSameDay() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.now(FIXED_DAYTIME_CLOCK);

        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);
        user.setPhone("0712345678");

        GeneralTask task = new GeneralTask();
        task.setId(taskId);
        task.setTitle("Task cu rata limitata");
        task.setAssigneeIds(userId.toString());
        task.setStatus("todo");
        task.setPriority("high");
        task.setCreatedAt(LocalDateTime.now(FIXED_DAYTIME_CLOCK).minusDays(2));
        task.setDueDate(today.plusDays(3).toString());

        when(generalRepository.findAllTasks()).thenReturn(List.of(task));
        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(user));
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), anyString(), anyString(), eq("CREATION")))
                .thenReturn(true);
        // Already sent reminder today on WhatsApp and PWA
        when(logRepository.existsReminderByTaskIdAndChannelAndRecipientAndSentDate(eq(taskId), anyString(), anyString(), eq(today)))
                .thenReturn(true);

        service.processTaskNotifications();

        // Should NOT dispatch any message because 1-reminder-per-day rate limit was reached
        verify(whatsAppNotificationService, never()).sendTaskNotification(any(), any(), anyBoolean(), anyInt(), anyInt());
        verify(pwaNotificationService, never()).sendTaskPushNotification(any(), any(), anyBoolean(), anyInt(), anyInt());
    }

    @Test
    void testDoneTaskSkippedFromReminders() {
        GeneralTask task = new GeneralTask();
        task.setId(UUID.randomUUID());
        task.setStatus("done");
        task.setPriority("high");

        when(generalRepository.findAllTasks()).thenReturn(List.of(task));

        service.processTaskNotifications();

        verifyNoInteractions(whatsAppNotificationService);
        verifyNoInteractions(pwaNotificationService);
    }

    @Test
    void testTaskUpdatedDoesNotReNotifyAlreadyNotifiedAssignee() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        AdminUser user = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        user.setId(userId);
        user.setPhone("0712345678");

        when(adminUserRepository.findById(userId)).thenReturn(Optional.of(user));
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), eq("WHATSAPP"), eq("0712345678"), eq("CREATION")))
                .thenReturn(true);
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), eq("PWA"), eq(userId.toString()), eq("CREATION")))
                .thenReturn(true);

        GeneralTask task = new GeneralTask();
        task.setId(taskId);
        task.setTitle("Modified Task Title");
        task.setAssigneeIds(userId.toString());

        service.onTaskUpdated(task);

        verify(whatsAppNotificationService, never()).sendTaskNotification(any(), any(), anyBoolean(), anyInt(), anyInt());
        verify(pwaNotificationService, never()).sendTaskPushNotification(any(), any(), anyBoolean(), anyInt(), anyInt());
    }

    @Test
    void testTaskUpdatedNotifiesNewlyAddedAssigneeOnly() {
        UUID taskId = UUID.randomUUID();
        UUID oldUserId = UUID.randomUUID();
        UUID newUserId = UUID.randomUUID();

        AdminUser oldUser = new AdminUser("Ion Popescu", "ion@test.ro", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        oldUser.setId(oldUserId);
        oldUser.setPhone("0711111111");

        AdminUser newUser = new AdminUser("Maria Ionescu", "maria@test.ro", "hash", AdminStatus.APPROVED, AdminRole.VOLUNTEER);
        newUser.setId(newUserId);
        newUser.setPhone("0722222222");

        when(adminUserRepository.findById(oldUserId)).thenReturn(Optional.of(oldUser));
        when(adminUserRepository.findById(newUserId)).thenReturn(Optional.of(newUser));

        // oldUser already notified
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), eq("WHATSAPP"), eq("0711111111"), eq("CREATION")))
                .thenReturn(true);
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), eq("PWA"), eq(oldUserId.toString()), eq("CREATION")))
                .thenReturn(true);

        // newUser not notified yet
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), eq("WHATSAPP"), eq("0722222222"), eq("CREATION")))
                .thenReturn(false);
        when(logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(eq(taskId), eq("PWA"), eq(newUserId.toString()), eq("CREATION")))
                .thenReturn(false);

        GeneralTask task = new GeneralTask();
        task.setId(taskId);
        task.setTitle("Task with added assignee");
        task.setAssigneeIds(oldUserId + "," + newUserId);

        service.onTaskUpdated(task);

        // only newUser receives notifications
        verify(whatsAppNotificationService, times(1))
                .sendTaskNotification(eq(task), eq("0722222222"), eq(false), eq(0), eq(0));
        verify(pwaNotificationService, times(1))
                .sendTaskPushNotification(eq(task), eq(newUserId.toString()), eq(false), eq(0), eq(0));

        // oldUser was never sent again
        verify(whatsAppNotificationService, never())
                .sendTaskNotification(eq(task), eq("0711111111"), anyBoolean(), anyInt(), anyInt());
        verify(pwaNotificationService, never())
                .sendTaskPushNotification(eq(task), eq(oldUserId.toString()), anyBoolean(), anyInt(), anyInt());
    }

    @Test
    void testTaskDeletedCleansUpLogs() {
        UUID taskId = UUID.randomUUID();
        service.onTaskDeleted(taskId);
        verify(logRepository, times(1)).deleteAllByTaskId(taskId);
    }
}

