package com.charityapp.repository.general;

import com.charityapp.model.general.TaskNotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface TaskNotificationLogRepository extends JpaRepository<TaskNotificationLog, UUID> {
    boolean existsByTaskIdAndChannelAndRecipientAndSentDate(UUID taskId, String channel, String recipient, LocalDate sentDate);
    boolean existsByTaskIdAndChannelAndRecipientAndNotificationType(UUID taskId, String channel, String recipient, String notificationType);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(l) > 0 FROM TaskNotificationLog l WHERE l.taskId = :taskId AND l.channel = :channel AND l.recipient = :recipient AND l.notificationType LIKE 'REMINDER_%' AND l.sentDate = :sentDate")
    boolean existsReminderByTaskIdAndChannelAndRecipientAndSentDate(
            @org.springframework.data.repository.query.Param("taskId") UUID taskId,
            @org.springframework.data.repository.query.Param("channel") String channel,
            @org.springframework.data.repository.query.Param("recipient") String recipient,
            @org.springframework.data.repository.query.Param("sentDate") LocalDate sentDate
    );

    @Transactional
    @Modifying
    void deleteAllByTaskId(UUID taskId);
}

