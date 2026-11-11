package com.charityapp.model.legal;

import java.time.LocalDateTime;
import java.util.UUID;

public class ContractTemplate {
    private UUID id;
    private String title;
    private String description;
    private String category; // 'general', 'sponsorship', 'volunteer', 'vendor', 'partnership', etc.
    private String googleDocsUrl;
    private String rawContent;
    private String fieldsSchema; // JSON array string of field definitions
    private String identifierPattern; // e.g. {{TEMPLATE}}_{{DATA}}_{{#}} or DATE_SPONSOR_NAME_#
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ContractTemplate() {
        this.id = UUID.randomUUID();
        this.category = "general";
        this.fieldsSchema = "[]";
        this.identifierPattern = "{{TEMPLATE}}_{{DATA}}_{{#}}";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public ContractTemplate(UUID id, String title, String description, String category,
                            String googleDocsUrl, String rawContent, String fieldsSchema,
                            String identifierPattern, String createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.title = title;
        this.description = description;
        this.category = (category != null && !category.isBlank()) ? category : "general";
        this.googleDocsUrl = googleDocsUrl;
        this.rawContent = rawContent;
        this.fieldsSchema = (fieldsSchema != null && !fieldsSchema.isBlank()) ? fieldsSchema : "[]";
        this.identifierPattern = (identifierPattern != null && !identifierPattern.isBlank()) ? identifierPattern : "{{TEMPLATE}}_{{DATA}}_{{#}}";
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

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getGoogleDocsUrl() { return googleDocsUrl; }
    public void setGoogleDocsUrl(String googleDocsUrl) { this.googleDocsUrl = googleDocsUrl; }

    public String getRawContent() { return rawContent; }
    public void setRawContent(String rawContent) { this.rawContent = rawContent; }

    public String getFieldsSchema() { return fieldsSchema; }
    public void setFieldsSchema(String fieldsSchema) { this.fieldsSchema = fieldsSchema; }

    public String getIdentifierPattern() { return identifierPattern; }
    public void setIdentifierPattern(String identifierPattern) { this.identifierPattern = identifierPattern; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
