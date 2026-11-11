package com.charityapp.model.communication;

import java.time.OffsetDateTime;
import java.util.UUID;

public class EmailTemplate {
    private UUID id;
    private String name;
    private String department;
    private String subject;
    private String blocks; // JSONB string
    private UUID createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public EmailTemplate() {
        this.id = UUID.randomUUID();
        this.department = "fundraising";
        this.blocks = "[]";
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public EmailTemplate(UUID id, String name, String department, String subject, String blocks, UUID createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.department = department != null ? department : "fundraising";
        this.subject = subject != null ? subject : "";
        this.blocks = blocks != null ? blocks : "[]";
        this.createdBy = createdBy;
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getBlocks() {
        return blocks;
    }

    public void setBlocks(String blocks) {
        this.blocks = blocks;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UUID createdBy) {
        this.createdBy = createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
