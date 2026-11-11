package com.charityapp.repository.legal;

import com.charityapp.dto.legal.LegalStatsDTO;
import com.charityapp.model.legal.ContractTemplate;
import com.charityapp.model.legal.GeneratedContract;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class LegalRepository {

    private static final Logger log = LoggerFactory.getLogger(LegalRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public LegalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initTables() {
        try {
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS legal;");

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS legal.contract_templates (
                    id UUID PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(100) NOT NULL DEFAULT 'general',
                    google_docs_url TEXT,
                    raw_content TEXT NOT NULL,
                    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_by VARCHAR(255),
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                );
            """);

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS legal.generated_contracts (
                    id UUID PRIMARY KEY,
                    template_id UUID REFERENCES legal.contract_templates(id) ON DELETE SET NULL,
                    contract_number VARCHAR(100) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'draft',
                    party_a_name VARCHAR(255) DEFAULT 'Organizația Caritabilă Familia',
                    party_b_name VARCHAR(255),
                    party_b_email VARCHAR(255),
                    field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
                    rendered_content TEXT NOT NULL,
                    pdf_data TEXT,
                    drive_file_id TEXT,
                    valid_from VARCHAR(50),
                    valid_until VARCHAR(50),
                    notes TEXT,
                    created_by VARCHAR(255),
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                );
                ALTER TABLE legal.contract_templates ADD COLUMN IF NOT EXISTS identifier_pattern TEXT;
                ALTER TABLE legal.generated_contracts ADD COLUMN IF NOT EXISTS pdf_data TEXT;
                ALTER TABLE legal.generated_contracts ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
                ALTER TABLE legal.generated_contracts ALTER COLUMN party_b_name DROP NOT NULL;
            """);
            log.info("Legal schema tables initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize legal schema tables: {}", e.getMessage(), e);
        }
    }

    private final RowMapper<ContractTemplate> templateRowMapper = (rs, rowNum) -> {
        ContractTemplate t = new ContractTemplate();
        t.setId(UUID.fromString(rs.getString("id")));
        t.setTitle(rs.getString("title"));
        t.setDescription(rs.getString("description"));
        t.setCategory(rs.getString("category"));
        t.setGoogleDocsUrl(rs.getString("google_docs_url"));
        t.setRawContent(rs.getString("raw_content"));
        t.setFieldsSchema(rs.getString("fields_schema"));
        try {
            t.setIdentifierPattern(rs.getString("identifier_pattern"));
        } catch (Exception ignored) {}
        t.setCreatedBy(rs.getString("created_by"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) t.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) t.setUpdatedAt(uat.toLocalDateTime());
        return t;
    };

    private final RowMapper<GeneratedContract> contractRowMapper = (rs, rowNum) -> {
        GeneratedContract c = new GeneratedContract();
        c.setId(UUID.fromString(rs.getString("id")));
        String tId = rs.getString("template_id");
        if (tId != null) c.setTemplateId(UUID.fromString(tId));
        c.setContractNumber(rs.getString("contract_number"));
        c.setTitle(rs.getString("title"));
        c.setStatus(rs.getString("status"));
        c.setPartyAName(rs.getString("party_a_name"));
        c.setPartyBName(rs.getString("party_b_name"));
        c.setPartyBEmail(rs.getString("party_b_email"));
        c.setFieldValues(rs.getString("field_values"));
        c.setRenderedContent(rs.getString("rendered_content"));
        try {
            c.setPdfData(rs.getString("pdf_data"));
        } catch (Exception ignored) {}
        try {
            c.setDriveFileId(rs.getString("drive_file_id"));
        } catch (Exception ignored) {}
        c.setValidFrom(rs.getString("valid_from"));
        c.setValidUntil(rs.getString("valid_until"));
        c.setNotes(rs.getString("notes"));
        c.setCreatedBy(rs.getString("created_by"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) c.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) c.setUpdatedAt(uat.toLocalDateTime());
        return c;
    };

    // Templates
    public List<ContractTemplate> findAllTemplates() {
        return jdbcTemplate.query("SELECT * FROM legal.contract_templates ORDER BY updated_at DESC", templateRowMapper);
    }

    public Optional<ContractTemplate> findTemplateById(UUID id) {
        String sql = "SELECT * FROM legal.contract_templates WHERE id = ?";
        List<ContractTemplate> list = jdbcTemplate.query(sql, templateRowMapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public ContractTemplate saveTemplate(ContractTemplate t) {
        if (t.getId() == null) t.setId(UUID.randomUUID());
        String sql = """
            INSERT INTO legal.contract_templates (id, title, description, category, google_docs_url, raw_content, fields_schema, identifier_pattern, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, NOW(), NOW())
        """;
        String schemaJson = (t.getFieldsSchema() != null && !t.getFieldsSchema().isBlank()) ? t.getFieldsSchema() : "[]";
        String pattern = (t.getIdentifierPattern() != null && !t.getIdentifierPattern().isBlank()) ? t.getIdentifierPattern() : "{{TEMPLATE}}_{{DATA}}_{{#}}";
        jdbcTemplate.update(sql, t.getId(), t.getTitle(), t.getDescription(), t.getCategory(), t.getGoogleDocsUrl(), t.getRawContent(), schemaJson, pattern, t.getCreatedBy());
        return t;
    }

    public int updateTemplate(ContractTemplate t) {
        String sql = """
            UPDATE legal.contract_templates
            SET title = ?, description = ?, category = ?, google_docs_url = ?, raw_content = ?, fields_schema = ?::jsonb, identifier_pattern = ?, updated_at = NOW()
            WHERE id = ?
        """;
        String schemaJson = (t.getFieldsSchema() != null && !t.getFieldsSchema().isBlank()) ? t.getFieldsSchema() : "[]";
        String pattern = (t.getIdentifierPattern() != null && !t.getIdentifierPattern().isBlank()) ? t.getIdentifierPattern() : "{{TEMPLATE}}_{{DATA}}_{{#}}";
        return jdbcTemplate.update(sql, t.getTitle(), t.getDescription(), t.getCategory(), t.getGoogleDocsUrl(), t.getRawContent(), schemaJson, pattern, t.getId());
    }

    public List<String> findExistingContractNumbersLike(String pattern) {
        String sql = "SELECT contract_number FROM legal.generated_contracts WHERE contract_number ILIKE ?";
        return jdbcTemplate.queryForList(sql, String.class, pattern);
    }

    public boolean existsContractNumber(String contractNumber) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM legal.generated_contracts WHERE lower(contract_number) = lower(?)",
            Integer.class,
            contractNumber
        );
        return count != null && count > 0;
    }

    public int deleteTemplate(UUID id) {
        return jdbcTemplate.update("DELETE FROM legal.contract_templates WHERE id = ?", id);
    }

    // Contracts
    public List<GeneratedContract> findAllContracts() {
        return jdbcTemplate.query("SELECT * FROM legal.generated_contracts ORDER BY created_at DESC", contractRowMapper);
    }

    public Optional<GeneratedContract> findContractById(UUID id) {
        String sql = "SELECT * FROM legal.generated_contracts WHERE id = ?";
        List<GeneratedContract> list = jdbcTemplate.query(sql, contractRowMapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public GeneratedContract saveContract(GeneratedContract c) {
        if (c.getId() == null) c.setId(UUID.randomUUID());
        String sql = """
            INSERT INTO legal.generated_contracts (id, template_id, contract_number, title, status, party_a_name, party_b_name, party_b_email, field_values, rendered_content, pdf_data, drive_file_id, valid_from, valid_until, notes, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        """;
        String valuesJson = (c.getFieldValues() != null && !c.getFieldValues().isBlank()) ? c.getFieldValues() : "{}";
        jdbcTemplate.update(sql, c.getId(), c.getTemplateId(), c.getContractNumber(), c.getTitle(), c.getStatus(), c.getPartyAName(), c.getPartyBName(), c.getPartyBEmail(), valuesJson, c.getRenderedContent(), c.getPdfData(), c.getDriveFileId(), c.getValidFrom(), c.getValidUntil(), c.getNotes(), c.getCreatedBy());
        return c;
    }

    public int updateContract(GeneratedContract c) {
        String sql = """
            UPDATE legal.generated_contracts
            SET title = ?, status = ?, party_a_name = ?, party_b_name = ?, party_b_email = ?, field_values = ?::jsonb, rendered_content = ?, pdf_data = ?, drive_file_id = ?, valid_from = ?, valid_until = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        """;
        String valuesJson = (c.getFieldValues() != null && !c.getFieldValues().isBlank()) ? c.getFieldValues() : "{}";
        return jdbcTemplate.update(sql, c.getTitle(), c.getStatus(), c.getPartyAName(), c.getPartyBName(), c.getPartyBEmail(), valuesJson, c.getRenderedContent(), c.getPdfData(), c.getDriveFileId(), c.getValidFrom(), c.getValidUntil(), c.getNotes(), c.getId());
    }

    public int deleteContract(UUID id) {
        return jdbcTemplate.update("DELETE FROM legal.generated_contracts WHERE id = ?", id);
    }

    public LegalStatsDTO getStats() {
        Long totalTemplates = jdbcTemplate.queryForObject("SELECT count(*) FROM legal.contract_templates", Long.class);
        Long totalContracts = jdbcTemplate.queryForObject("SELECT count(*) FROM legal.generated_contracts", Long.class);
        Long draftContracts = jdbcTemplate.queryForObject("SELECT count(*) FROM legal.generated_contracts WHERE status = 'draft'", Long.class);
        Long pendingContracts = jdbcTemplate.queryForObject("SELECT count(*) FROM legal.generated_contracts WHERE status = 'pending_signature'", Long.class);
        Long signedContracts = jdbcTemplate.queryForObject("SELECT count(*) FROM legal.generated_contracts WHERE status = 'signed'", Long.class);
        Long archivedContracts = jdbcTemplate.queryForObject("SELECT count(*) FROM legal.generated_contracts WHERE status = 'archived'", Long.class);

        return new LegalStatsDTO(
            totalTemplates != null ? totalTemplates : 0L,
            totalContracts != null ? totalContracts : 0L,
            draftContracts != null ? draftContracts : 0L,
            pendingContracts != null ? pendingContracts : 0L,
            signedContracts != null ? signedContracts : 0L,
            archivedContracts != null ? archivedContracts : 0L
        );
    }
}
