package com.charityapp.model.general;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.time.LocalDateTime;
import java.util.UUID;

public class GeneralTask {
    private UUID id;
    private String title;
    private String description;
    private String department;
    private String priority; // 'low' | 'medium' | 'high'
    private String status;   // 'todo' | 'in_progress' | 'done'
    private String assignee;

    @JsonDeserialize(using = AssigneeIdsDeserializer.class)
    private String assigneeIds;

    private String startDate; // YYYY-MM-DD
    private String dueDate;  // YYYY-MM-DD
    private Integer reminderCount = 3;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static class AssigneeIdsDeserializer extends com.fasterxml.jackson.databind.JsonDeserializer<String> {
        @Override
        public String deserialize(com.fasterxml.jackson.core.JsonParser p, com.fasterxml.jackson.databind.DeserializationContext ctxt) throws java.io.IOException {
            if (p.currentToken() == com.fasterxml.jackson.core.JsonToken.START_ARRAY) {
                java.util.List<String> list = new java.util.ArrayList<>();
                while (p.nextToken() != com.fasterxml.jackson.core.JsonToken.END_ARRAY) {
                    String val = p.getText();
                    if (val != null && !val.isBlank()) {
                        list.add(val.trim());
                    }
                }
                return String.join(",", list);
            }
            return p.getText();
        }
    }

    public GeneralTask() {
        this.id = UUID.randomUUID();
        this.priority = "medium";
        this.status = "todo";
        this.reminderCount = 3;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public GeneralTask(UUID id, String title, String description, String department,
                       String priority, String status, String assignee, String dueDate,
                       String createdBy) {
        this(id, title, description, department, priority, status, assignee, null, null, dueDate, 3, createdBy);
    }

    public GeneralTask(UUID id, String title, String description, String department,
                       String priority, String status, String assignee, String assigneeIds,
                       String dueDate, String createdBy) {
        this(id, title, description, department, priority, status, assignee, assigneeIds, null, dueDate, 3, createdBy);
    }

    public GeneralTask(UUID id, String title, String description, String department,
                       String priority, String status, String assignee, String assigneeIds,
                       String startDate, String dueDate, String createdBy) {
        this(id, title, description, department, priority, status, assignee, assigneeIds, startDate, dueDate, 3, createdBy);
    }

    public GeneralTask(UUID id, String title, String description, String department,
                       String priority, String status, String assignee, String assigneeIds,
                       String startDate, String dueDate, Integer reminderCount, String createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.title = title;
        this.description = description;
        this.department = department;
        this.priority = priority != null ? priority : "medium";
        this.status = status != null ? status : "todo";
        this.assignee = assignee;
        this.assigneeIds = assigneeIds;
        this.startDate = startDate;
        this.dueDate = dueDate;
        this.reminderCount = reminderCount != null ? reminderCount : 3;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }

    public String getAssigneeIds() { return assigneeIds; }
    public void setAssigneeIds(String assigneeIds) { this.assigneeIds = assigneeIds; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public Integer getReminderCount() { return reminderCount; }
    public void setReminderCount(Integer reminderCount) { this.reminderCount = reminderCount; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
