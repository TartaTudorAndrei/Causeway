package com.charityapp.repository.communication;

import com.charityapp.model.communication.EmailLog;
import com.charityapp.model.communication.EmailTemplate;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class EmailRepository {

    private static final Logger log = LoggerFactory.getLogger(EmailRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public EmailRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initTables() {
        try {
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS communication;");

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS communication.email_templates (
                    id UUID PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    department VARCHAR(50) NOT NULL DEFAULT 'fundraising',
                    subject VARCHAR(255) NOT NULL,
                    blocks TEXT NOT NULL DEFAULT '[]',
                    created_by UUID,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """);

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS communication.email_logs (
                    id UUID PRIMARY KEY,
                    template_id UUID,
                    recipient_email VARCHAR(255) NOT NULL,
                    recipient_name VARCHAR(255),
                    subject VARCHAR(255) NOT NULL,
                    dispatch_method VARCHAR(20) NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'SENT',
                    sent_by UUID,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """);

            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_email_templates_dept ON communication.email_templates(department);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON communication.email_logs(sent_at DESC);");
        } catch (Exception e) {
            log.warn("Communication schema initialization notice: {}", e.getMessage());
        }
    }

    private final RowMapper<EmailTemplate> templateRowMapper = (rs, rowNum) -> {
        EmailTemplate t = new EmailTemplate();
        t.setId((UUID) rs.getObject("id"));
        t.setName(rs.getString("name"));
        t.setDepartment(rs.getString("department"));
        t.setSubject(rs.getString("subject"));
        t.setBlocks(rs.getString("blocks"));
        t.setCreatedBy((UUID) rs.getObject("created_by"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) t.setCreatedAt(cat.toInstant().atOffset(ZoneOffset.UTC));
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) t.setUpdatedAt(uat.toInstant().atOffset(ZoneOffset.UTC));
        return t;
    };

    private final RowMapper<EmailLog> logRowMapper = (rs, rowNum) -> {
        EmailLog l = new EmailLog();
        l.setId((UUID) rs.getObject("id"));
        l.setTemplateId((UUID) rs.getObject("template_id"));
        l.setRecipientEmail(rs.getString("recipient_email"));
        l.setRecipientName(rs.getString("recipient_name"));
        l.setSubject(rs.getString("subject"));
        l.setDispatchMethod(rs.getString("dispatch_method"));
        l.setStatus(rs.getString("status"));
        l.setSentBy((UUID) rs.getObject("sent_by"));
        Timestamp sat = rs.getTimestamp("sent_at");
        if (sat != null) l.setSentAt(sat.toInstant().atOffset(ZoneOffset.UTC));
        return l;
    };

    // Template operations
    public List<EmailTemplate> findAllTemplates(String department) {
        if (department != null && !department.isBlank() && !department.equalsIgnoreCase("ALL")) {
            return jdbcTemplate.query(
                "SELECT * FROM communication.email_templates WHERE department = ? ORDER BY updated_at DESC",
                templateRowMapper,
                department.toLowerCase()
            );
        }
        return jdbcTemplate.query("SELECT * FROM communication.email_templates ORDER BY updated_at DESC", templateRowMapper);
    }

    public Optional<EmailTemplate> findTemplateById(UUID id) {
        List<EmailTemplate> list = jdbcTemplate.query(
            "SELECT * FROM communication.email_templates WHERE id = ?",
            templateRowMapper,
            id
        );
        return list.stream().findFirst();
    }

    public EmailTemplate saveTemplate(EmailTemplate template) {
        if (template.getId() == null) {
            template.setId(UUID.randomUUID());
        }
        jdbcTemplate.update("""
            INSERT INTO communication.email_templates (id, name, department, subject, blocks, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?::jsonb, ?, NOW(), NOW())
        """,
            template.getId(),
            template.getName(),
            template.getDepartment(),
            template.getSubject(),
            template.getBlocks() != null ? template.getBlocks() : "[]",
            template.getCreatedBy()
        );
        return findTemplateById(template.getId()).orElse(template);
    }

    public EmailTemplate updateTemplate(UUID id, EmailTemplate template) {
        jdbcTemplate.update("""
            UPDATE communication.email_templates
            SET name = ?, department = ?, subject = ?, blocks = ?::jsonb, updated_at = NOW()
            WHERE id = ?
        """,
            template.getName(),
            template.getDepartment(),
            template.getSubject(),
            template.getBlocks() != null ? template.getBlocks() : "[]",
            id
        );
        return findTemplateById(id).orElse(template);
    }

    public boolean deleteTemplate(UUID id) {
        int rows = jdbcTemplate.update("DELETE FROM communication.email_templates WHERE id = ?", id);
        return rows > 0;
    }

    // Log operations
    public EmailLog saveLog(EmailLog emailLog) {
        if (emailLog.getId() == null) {
            emailLog.setId(UUID.randomUUID());
        }
        jdbcTemplate.update("""
            INSERT INTO communication.email_logs (id, template_id, recipient_email, recipient_name, subject, dispatch_method, status, sent_by, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        """,
            emailLog.getId(),
            emailLog.getTemplateId(),
            emailLog.getRecipientEmail(),
            emailLog.getRecipientName(),
            emailLog.getSubject(),
            emailLog.getDispatchMethod(),
            emailLog.getStatus(),
            emailLog.getSentBy()
        );
        return emailLog;
    }

    public List<EmailLog> findRecentLogs(int limit) {
        int max = limit > 0 && limit <= 200 ? limit : 50;
        return jdbcTemplate.query(
            "SELECT * FROM communication.email_logs ORDER BY sent_at DESC LIMIT ?",
            logRowMapper,
            max
        );
    }
}
