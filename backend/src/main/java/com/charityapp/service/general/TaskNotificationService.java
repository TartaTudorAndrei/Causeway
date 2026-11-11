package com.charityapp.service.general;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.general.GeneralTask;
import com.charityapp.model.general.TaskNotificationLog;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.general.GeneralRepository;
import com.charityapp.repository.general.TaskNotificationLogRepository;
import com.charityapp.service.notification.PwaNotificationService;
import com.charityapp.service.notification.WhatsAppNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class TaskNotificationService {

    private static final Logger log = LoggerFactory.getLogger(TaskNotificationService.class);

    private final TaskNotificationLogRepository logRepository;
    private final GeneralRepository generalRepository;
    private final AdminUserRepository adminUserRepository;
    private final WhatsAppNotificationService whatsAppNotificationService;
    private final PwaNotificationService pwaNotificationService;
    private final Clock clock;

    public record TaskRecipient(String userId, String phone, String fullName, boolean whatsappEnabled) {}

    @Autowired
    public TaskNotificationService(TaskNotificationLogRepository logRepository,
                                   @Lazy GeneralRepository generalRepository,
                                   @Lazy AdminUserRepository adminUserRepository,
                                   @Lazy WhatsAppNotificationService whatsAppNotificationService,
                                   @Lazy PwaNotificationService pwaNotificationService) {
        this(logRepository, generalRepository, adminUserRepository, whatsAppNotificationService, pwaNotificationService, Clock.system(ZONE_RO));
    }

    public TaskNotificationService(TaskNotificationLogRepository logRepository,
                                   GeneralRepository generalRepository,
                                   AdminUserRepository adminUserRepository,
                                   WhatsAppNotificationService whatsAppNotificationService,
                                   PwaNotificationService pwaNotificationService,
                                   Clock clock) {
        this.logRepository = logRepository;
        this.generalRepository = generalRepository;
        this.adminUserRepository = adminUserRepository;
        this.whatsAppNotificationService = whatsAppNotificationService;
        this.pwaNotificationService = pwaNotificationService;
        this.clock = clock != null ? clock : Clock.system(ZONE_RO);
    }

    public static final java.time.ZoneId ZONE_RO = java.time.ZoneId.of("Europe/Bucharest");

    /**
     * Checks if given time falls into quiet hours (23:00 to 08:00).
     */
    public boolean isQuietHours(LocalTime time) {
        if (time == null) return false;
        int hour = time.getHour();
        return hour >= 23 || hour < 8;
    }

    /**
     * Determines total reminder checkpoints for a task:
     * - Uses task.reminderCount if set.
     * - Falls back to priority-based calculation if not set.
     */
    public int getReminderCount(GeneralTask task) {
        if (task == null) return 3;
        if (task.getReminderCount() != null) {
            return Math.max(0, task.getReminderCount());
        }
        return getReminderCountForPriority(task.getPriority());
    }

    /**
     * Calculates maximum possible reminders (at most 1 per day for multi-day, or up to 2 for intra-day).
     */
    public int getMaxPossibleReminders(LocalDateTime windowStart, LocalDateTime deadline) {
        if (windowStart == null || deadline == null || !deadline.isAfter(windowStart)) {
            return 0;
        }
        long hours = Duration.between(windowStart, deadline).toHours();
        if (hours < 4) {
            return 1;
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(windowStart.toLocalDate(), deadline.toLocalDate());
        if (days <= 0) {
            return hours >= 8 ? 2 : 1;
        }
        return (int) Math.max(1, days);
    }

    /**
     * Resolves effective reminder count without exceeding realistic limits.
     */
    public int getEffectiveReminderCount(GeneralTask task, LocalDateTime windowStart, LocalDateTime deadline) {
        int requested = getReminderCount(task);
        if (requested <= 0) return 0;
        int maxPossible = getMaxPossibleReminders(windowStart, deadline);
        if (maxPossible <= 0) return 0;
        if (requested > maxPossible) {
            return maxPossible;
        }
        return requested;
    }

    /**
     * Determines total reminder checkpoints based on priority:
     * - low: 1 reminder (at 50% midpoint)
     * - medium: 3 reminders (at 25%, 50%, 75%)
     * - high: 5 reminders (at 16.67%, 33.33%, 50%, 66.67%, 83.33%)
     */
    public int getReminderCountForPriority(String priority) {
        if (priority == null) return 3;
        return switch (priority.trim().toLowerCase()) {
            case "low", "scazuta", "scăzută" -> 1;
            case "high", "ridicata", "ridicată" -> 5;
            default -> 3;
        };
    }

    /**
     * Calculates evenly distributed reminder checkpoints in the interval (windowStart, deadline),
     * shifting any checkpoint that lands in quiet hours to morning (08:30).
     */
    public List<LocalDateTime> calculateCheckpoints(LocalDateTime windowStart, LocalDateTime deadline, int reminderCount) {
        if (windowStart == null || deadline == null || reminderCount <= 0) {
            return List.of();
        }
        if (!deadline.isAfter(windowStart)) {
            return List.of();
        }

        long totalSeconds = Duration.between(windowStart, deadline).getSeconds();
        if (totalSeconds <= 0) {
            return List.of();
        }

        List<LocalDateTime> checkpoints = new ArrayList<>(reminderCount);
        for (int k = 1; k <= reminderCount; k++) {
            double fraction = (double) k / (reminderCount + 1.0);
            long offsetSeconds = (long) (totalSeconds * fraction);
            LocalDateTime cp = windowStart.plusSeconds(offsetSeconds);

            // Shift checkpoints out of quiet hours (23:00 - 08:00)
            if (isQuietHours(cp.toLocalTime())) {
                if (cp.getHour() >= 23) {
                    cp = cp.plusDays(1).toLocalDate().atTime(8, 30);
                } else {
                    cp = cp.toLocalDate().atTime(8, 30);
                }
                if (!cp.isBefore(deadline)) {
                    cp = deadline.minusMinutes(5);
                }
            }
            checkpoints.add(cp);
        }
        return checkpoints;
    }

    /**
     * Parses interval start date string (YYYY-MM-DD or ISO datetime).
     */
    public LocalDateTime parseStartDate(String startDate) {
        if (startDate == null || startDate.isBlank()) {
            return null;
        }
        String trimmed = startDate.trim();
        try {
            if (trimmed.length() == 10 && trimmed.contains("-")) {
                LocalDate date = LocalDate.parse(trimmed);
                return date.atStartOfDay();
            }
            if (trimmed.contains("T")) {
                return LocalDateTime.parse(trimmed);
            }
            if (trimmed.contains(" ")) {
                return LocalDateTime.parse(trimmed.replace(" ", "T"));
            }
            LocalDate date = LocalDate.parse(trimmed);
            return date.atStartOfDay();
        } catch (DateTimeParseException e) {
            log.debug("Could not parse task startDate '{}': {}", startDate, e.getMessage());
            return null;
        }
    }

    /**
     * Parses deadline string (YYYY-MM-DD or ISO datetime).
     * For date-only strings, returns 23:59:59 on that date.
     */
    public LocalDateTime parseDeadline(String dueDate) {
        if (dueDate == null || dueDate.isBlank()) {
            return null;
        }
        String trimmed = dueDate.trim();
        try {
            if (trimmed.length() == 10 && trimmed.contains("-")) {
                LocalDate date = LocalDate.parse(trimmed);
                return date.atTime(23, 59, 59);
            }
            if (trimmed.contains("T")) {
                return LocalDateTime.parse(trimmed);
            }
            if (trimmed.contains(" ")) {
                return LocalDateTime.parse(trimmed.replace(" ", "T"));
            }
            LocalDate date = LocalDate.parse(trimmed);
            return date.atTime(23, 59, 59);
        } catch (DateTimeParseException e) {
            log.debug("Could not parse task dueDate '{}': {}", dueDate, e.getMessage());
            return null;
        }
    }

    /**
     * Resolves recipients from assigneeIds and assignee names.
     */
    public List<TaskRecipient> resolveRecipients(GeneralTask task) {
        if (task == null || adminUserRepository == null) {
            return List.of();
        }

        Map<String, TaskRecipient> recipientsMap = new LinkedHashMap<>();

        // 1. Resolve by assigneeIds
        if (task.getAssigneeIds() != null && !task.getAssigneeIds().isBlank()) {
            String clean = task.getAssigneeIds().replace("[", "").replace("]", "").replace("\"", "");
            for (String rawId : clean.split(",")) {
                String trimmed = rawId.trim();
                if (!trimmed.isEmpty()) {
                    try {
                        UUID uid = UUID.fromString(trimmed);
                        adminUserRepository.findById(uid).ifPresent(u -> {
                            String phone = (u.getPhone() != null && !u.getPhone().isBlank()) ? u.getPhone().trim() : null;
                            recipientsMap.put(u.getId().toString(), new TaskRecipient(u.getId().toString(), phone, u.getFullName(), u.isWhatsappNotificationsEnabled()));
                        });
                    } catch (Exception ignored) {}
                }
            }
        }

        // 2. Also resolve by assignee name matching if any names provided
        if (task.getAssignee() != null && !task.getAssignee().isBlank()) {
            for (String name : task.getAssignee().split(",")) {
                String trimmedName = name.trim();
                if (!trimmedName.isEmpty() && !trimmedName.equalsIgnoreCase("Unassigned") && !trimmedName.equalsIgnoreCase("Neasignat")) {
                    adminUserRepository.findByFullName(trimmedName).ifPresentOrElse(
                        u -> {
                            String phone = (u.getPhone() != null && !u.getPhone().isBlank()) ? u.getPhone().trim() : null;
                            recipientsMap.put(u.getId().toString(), new TaskRecipient(u.getId().toString(), phone, u.getFullName(), u.isWhatsappNotificationsEnabled()));
                        },
                        () -> {
                            try {
                                adminUserRepository.findAll().stream()
                                    .filter(u -> u.getFullName() != null && u.getFullName().trim().equalsIgnoreCase(trimmedName))
                                    .findFirst()
                                    .ifPresent(u -> {
                                        String phone = (u.getPhone() != null && !u.getPhone().isBlank()) ? u.getPhone().trim() : null;
                                        recipientsMap.put(u.getId().toString(), new TaskRecipient(u.getId().toString(), phone, u.getFullName(), u.isWhatsappNotificationsEnabled()));
                                    });
                            } catch (Exception ignored) {}
                        }
                    );
                }
            }
        }

        return new ArrayList<>(recipientsMap.values());
    }

    /**
     * Handles task creation event: sends initial notification if outside quiet hours,
     * and records log entry so rate limits and scheduled reminders work properly.
     */
    public void onTaskCreated(GeneralTask task) {
        if (task == null || task.getId() == null) return;

        LocalTime nowTime = LocalTime.now(clock);
        if (isQuietHours(nowTime)) {
            log.info("Task {} created during quiet hours (23:00-08:00 RO time, current: {}). Notification deferred to morning.", task.getId(), nowTime);
            return;
        }

        LocalDate today = LocalDate.now(clock);
        List<TaskRecipient> recipients = resolveRecipients(task);
        log.info("Task {} created: found {} assignees (recipients: {})", task.getId(), recipients.size(), recipients);

        if (!recipients.isEmpty()) {
            boolean anyPhoneSent = false;
            for (TaskRecipient recipient : recipients) {
                // WhatsApp
                if (recipient.whatsappEnabled() && recipient.phone() != null && !recipient.phone().isBlank() && whatsAppNotificationService != null) {
                    boolean alreadyCreated = logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "WHATSAPP", recipient.phone(), "CREATION");
                    boolean sentToday = logRepository.existsByTaskIdAndChannelAndRecipientAndSentDate(task.getId(), "WHATSAPP", recipient.phone(), today);
                    if (!alreadyCreated && !sentToday) {
                        log.info("Dispatching WhatsApp task creation notification for task {} to phone {}", task.getId(), recipient.phone());
                        whatsAppNotificationService.sendTaskNotification(task, recipient.phone(), false, 0, 0);
                        logRepository.save(new TaskNotificationLog(task.getId(), "WHATSAPP", "CREATION", recipient.phone(), today));
                        anyPhoneSent = true;
                    }
                } else {
                    log.info("Skipping direct WhatsApp for recipient {} (phone={}, whatsappEnabled={})",
                            recipient.fullName(), recipient.phone(), recipient.whatsappEnabled());
                }
                // PWA
                if (recipient.userId() != null && !recipient.userId().isBlank() && pwaNotificationService != null) {
                    boolean alreadyCreated = logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "PWA", recipient.userId(), "CREATION");
                    boolean sentToday = logRepository.existsByTaskIdAndChannelAndRecipientAndSentDate(task.getId(), "PWA", recipient.userId(), today);
                    if (!alreadyCreated && !sentToday) {
                        pwaNotificationService.sendTaskPushNotification(task, recipient.userId(), false, 0, 0);
                        logRepository.save(new TaskNotificationLog(task.getId(), "PWA", "CREATION", recipient.userId(), today));
                    }
                }
            }
            if (!anyPhoneSent && whatsAppNotificationService != null) {
                if (!logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "WHATSAPP", "GROUP", "CREATION")) {
                    whatsAppNotificationService.sendTaskNotification(task, null, false, 0, 0);
                    logRepository.save(new TaskNotificationLog(task.getId(), "WHATSAPP", "CREATION", "GROUP", today));
                }
            }
        } else {
            // Task has no direct assignee: trigger group/broadcast rules if configured
            if (whatsAppNotificationService != null) {
                if (!logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "WHATSAPP", "GROUP", "CREATION")) {
                    whatsAppNotificationService.sendTaskNotification(task, null, false, 0, 0);
                    logRepository.save(new TaskNotificationLog(task.getId(), "WHATSAPP", "CREATION", "GROUP", today));
                }
            }
            if (pwaNotificationService != null) {
                if (!logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "PWA", "BROADCAST", "CREATION")) {
                    pwaNotificationService.sendTaskPushNotification(task, null, false, 0, 0);
                    logRepository.save(new TaskNotificationLog(task.getId(), "PWA", "CREATION", "BROADCAST", today));
                }
            }
        }
    }

    /**
     * Handles task modification / update:
     * Only dispatches initial assignment notification to newly added assignees who haven't received one yet.
     * Does not re-notify existing assignees or resend creation broadcasts.
     */
    public void onTaskUpdated(GeneralTask task) {
        if (task == null || task.getId() == null) return;

        LocalTime nowTime = LocalTime.now(clock);
        if (isQuietHours(nowTime)) {
            log.info("Task {} updated during quiet hours. Skipping notifications.", task.getId());
            return;
        }

        LocalDate today = LocalDate.now(clock);
        List<TaskRecipient> recipients = resolveRecipients(task);

        if (!recipients.isEmpty()) {
            for (TaskRecipient recipient : recipients) {
                // WhatsApp: only newly assigned users
                if (recipient.whatsappEnabled() && recipient.phone() != null && !recipient.phone().isBlank() && whatsAppNotificationService != null) {
                    boolean alreadyNotified = logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "WHATSAPP", recipient.phone(), "CREATION");
                    if (!alreadyNotified) {
                        log.info("Dispatching WhatsApp notification to newly assigned recipient {} for task {}", recipient.phone(), task.getId());
                        whatsAppNotificationService.sendTaskNotification(task, recipient.phone(), false, 0, 0);
                        logRepository.save(new TaskNotificationLog(task.getId(), "WHATSAPP", "CREATION", recipient.phone(), today));
                    }
                }
                // PWA: only newly assigned users
                if (recipient.userId() != null && !recipient.userId().isBlank() && pwaNotificationService != null) {
                    boolean alreadyNotified = logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), "PWA", recipient.userId(), "CREATION");
                    if (!alreadyNotified) {
                        log.info("Dispatching PWA push notification to newly assigned recipient {} for task {}", recipient.userId(), task.getId());
                        pwaNotificationService.sendTaskPushNotification(task, recipient.userId(), false, 0, 0);
                        logRepository.save(new TaskNotificationLog(task.getId(), "PWA", "CREATION", recipient.userId(), today));
                    }
                }
            }
        }
    }

    /**
     * Handles task deletion: cleans up notification logs.
     */
    public void onTaskDeleted(UUID taskId) {
        if (taskId == null || logRepository == null) return;
        try {
            logRepository.deleteAllByTaskId(taskId);
        } catch (Exception e) {
            log.error("Failed to delete task notification logs for task {}: {}", taskId, e.getMessage(), e);
        }
    }


    /**
     * Scheduled processor running every 10 minutes:
     * 1. Skips during quiet hours (23:00 - 08:00).
     * 2. Sends deferred creation notifications for tasks created overnight.
     * 3. Sends priority-based reminders according to window checkpoints, with strict max 1 notification per day cap.
     */
    @Scheduled(fixedRate = 600000)
    public void processTaskNotifications() {
        LocalTime nowTime = LocalTime.now(clock);
        if (isQuietHours(nowTime)) {
            return;
        }

        if (generalRepository == null || logRepository == null) {
            return;
        }

        try {
            LocalDate today = LocalDate.now(clock);
            LocalDateTime now = LocalDateTime.now(clock);

            List<GeneralTask> tasks = generalRepository.findAllTasks();
            if (tasks == null || tasks.isEmpty()) {
                return;
            }

            for (GeneralTask task : tasks) {
                if (task == null || task.getId() == null || "done".equalsIgnoreCase(task.getStatus())) {
                    continue;
                }

                LocalDateTime createdAt = task.getCreatedAt() != null ? task.getCreatedAt() : now;
                LocalDateTime deadline = parseDeadline(task.getDueDate());
                if (deadline == null || !deadline.isAfter(now)) {
                    continue;
                }

                LocalDateTime intervalStart = parseStartDate(task.getStartDate());
                LocalDateTime windowStart = (intervalStart != null && !intervalStart.isBefore(createdAt)) ? intervalStart : createdAt;
                if (!deadline.isAfter(windowStart)) {
                    continue;
                }

                int reminderCount = getEffectiveReminderCount(task, windowStart, deadline);
                List<LocalDateTime> checkpoints = (reminderCount > 0)
                        ? calculateCheckpoints(windowStart, deadline, reminderCount)
                        : List.of();

                List<TaskRecipient> recipients = resolveRecipients(task);
                if (recipients.isEmpty()) {
                    continue;
                }

                for (TaskRecipient recipient : recipients) {
                    // 1. Process WhatsApp
                    if (recipient.whatsappEnabled() && recipient.phone() != null && !recipient.phone().isBlank() && whatsAppNotificationService != null) {
                        processChannelForRecipient(task, "WHATSAPP", recipient.phone(), today, now, deadline, checkpoints, reminderCount);
                    }

                    // 2. Process PWA
                    if (recipient.userId() != null && !recipient.userId().isBlank() && pwaNotificationService != null) {
                        processChannelForRecipient(task, "PWA", recipient.userId(), today, now, deadline, checkpoints, reminderCount);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error in TaskNotificationService.processTaskNotifications: {}", e.getMessage(), e);
        }
    }

    private void processChannelForRecipient(GeneralTask task,
                                            String channel,
                                            String recipientKey,
                                            LocalDate today,
                                            LocalDateTime now,
                                            LocalDateTime deadline,
                                            List<LocalDateTime> checkpoints,
                                            int totalReminders) {
        // Check if initial CREATION notification was never sent (e.g. created during quiet hours overnight)
        boolean creationLogged = logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), channel, recipientKey, "CREATION");
        if (!creationLogged) {
            boolean sentAnyToday = logRepository.existsByTaskIdAndChannelAndRecipientAndSentDate(task.getId(), channel, recipientKey, today);
            if (!sentAnyToday) {
                dispatchMessage(task, channel, recipientKey, false, 0, 0);
                logRepository.save(new TaskNotificationLog(task.getId(), channel, "CREATION", recipientKey, today));
            }
            return;
        }

        // Anti-spam Rule 1: Max 1 reminder per day per recipient for this task
        if (logRepository.existsReminderByTaskIdAndChannelAndRecipientAndSentDate(task.getId(), channel, recipientKey, today)) {
            return;
        }

        // Anti-spam Rule 2: If task created today, enforce minimum 2 hours spacing before first reminder
        if (task.getCreatedAt() != null && task.getCreatedAt().toLocalDate().isEqual(today)) {
            long hoursSinceCreation = Duration.between(task.getCreatedAt(), now).toHours();
            if (hoursSinceCreation < 2) {
                return;
            }
        }

        // Check reminder checkpoints
        if (deadline == null || now.isAfter(deadline) || checkpoints.isEmpty()) {
            return;
        }

        // Find highest past checkpoint eligible to fire (prevents backlog spamming upon deployment)
        int eligibleIndex = -1;
        for (int k = checkpoints.size(); k >= 1; k--) {
            LocalDateTime cp = checkpoints.get(k - 1);
            if (!now.isBefore(cp)) {
                eligibleIndex = k;
                break;
            }
        }

        if (eligibleIndex <= 0) {
            return;
        }

        String reminderType = "REMINDER_" + eligibleIndex;
        boolean alreadySent = logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), channel, recipientKey, reminderType);
        if (!alreadySent) {
            // Backfill earlier checkpoints silently in log so old checkpoints are never replayed later
            for (int prev = 1; prev < eligibleIndex; prev++) {
                String prevType = "REMINDER_" + prev;
                if (!logRepository.existsByTaskIdAndChannelAndRecipientAndNotificationType(task.getId(), channel, recipientKey, prevType)) {
                    logRepository.save(new TaskNotificationLog(task.getId(), channel, prevType, recipientKey, today));
                }
            }

            dispatchMessage(task, channel, recipientKey, true, eligibleIndex, totalReminders);
            logRepository.save(new TaskNotificationLog(task.getId(), channel, reminderType, recipientKey, today));
        }
    }

    private void dispatchMessage(GeneralTask task, String channel, String recipientKey, boolean isReminder, int reminderIndex, int totalReminders) {
        try {
            if ("WHATSAPP".equalsIgnoreCase(channel)) {
                whatsAppNotificationService.sendTaskNotification(task, recipientKey, isReminder, reminderIndex, totalReminders);
            } else if ("PWA".equalsIgnoreCase(channel)) {
                pwaNotificationService.sendTaskPushNotification(task, recipientKey, isReminder, reminderIndex, totalReminders);
            }
        } catch (Exception e) {
            log.error("Failed to dispatch task notification (channel: {}, task: {}, recipient: {}): {}",
                    channel, task.getId(), recipientKey, e.getMessage());
        }
    }
}
