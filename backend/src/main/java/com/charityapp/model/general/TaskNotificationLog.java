package com.charityapp.model.general;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "task_notification_logs", schema = "general")
public class TaskNotificationLog {

    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Column(name = "channel", nullable = false, length = 20)
    private String channel; // 'WHATSAPP' | 'PWA'

    @Column(name = "notification_type", nullable = false, length = 30)
    private String notificationType; // 'CREATION' | 'REMINDER_1' | 'REMINDER_2' ...

    @Column(name = "recipient", nullable = false, length = 255)
    private String recipient; // phone number, user UUID, or group JID

    @Column(name = "sent_date", nullable = false)
    private LocalDate sentDate;

    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt;

    public TaskNotificationLog() {
        this.id = UUID.randomUUID();
        this.sentDate = LocalDate.now();
        this.sentAt = OffsetDateTime.now();
    }

    public TaskNotificationLog(UUID taskId, String channel, String notificationType, String recipient, LocalDate sentDate) {
        this.id = UUID.randomUUID();
        this.taskId = taskId;
        this.channel = channel;
        this.notificationType = notificationType;
        this.recipient = recipient;
        this.sentDate = sentDate != null ? sentDate : LocalDate.now();
        this.sentAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public LocalDate getSentDate() {
        return sentDate;
    }

    public void setSentDate(LocalDate sentDate) {
        this.sentDate = sentDate;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(OffsetDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
