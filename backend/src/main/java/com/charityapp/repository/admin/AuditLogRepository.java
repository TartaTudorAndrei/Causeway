package com.charityapp.repository.admin;

import com.charityapp.model.admin.AuditLog;
import com.charityapp.model.auth.ScopeType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class AuditLogRepository {
    private final JdbcTemplate jdbcTemplate;

    public AuditLogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public AuditLog save(AuditLog log) {
        if (log.getId() == null) {
            log.setId(UUID.randomUUID());
        }

        String sql = """
            INSERT INTO auth.audit_logs 
            (id, actor_id, actor_email, actor_name, department, action, resource_type, resource_id, resource_name, summary, scope_type, scope_id, state_changes, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)
            """;

        jdbcTemplate.update(sql,
            log.getId(),
            log.getActorId(),
            log.getActorEmail() != null && !log.getActorEmail().isBlank() ? log.getActorEmail() : "system@example.org",
            log.getActorName() != null && !log.getActorName().isBlank() ? log.getActorName() : "System",
            log.getDepartment() != null ? log.getDepartment() : "GENERAL",
            log.getAction(),
            log.getResourceType(),
            log.getResourceId(),
            log.getResourceName(),
            log.getSummary(),
            log.getScopeType() != null ? log.getScopeType().name() : ScopeType.GLOBAL.name(),
            log.getScopeId(),
            log.getStateChanges() != null && !log.getStateChanges().isBlank() ? log.getStateChanges() : "{}",
            log.getIpAddress(),
            log.getUserAgent(),
            Timestamp.valueOf(log.getCreatedAt())
        );

        return log;
    }

    public List<AuditLog> findByActorId(UUID actorId) {
        String sql = "SELECT * FROM auth.audit_logs WHERE actor_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper, actorId);
    }

    public List<AuditLog> findAll() {
        String sql = "SELECT * FROM auth.audit_logs ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public List<AuditLog> findWithFilters(String department, String action, String search, Integer limit) {
        StringBuilder sql = new StringBuilder("SELECT * FROM auth.audit_logs WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (department != null && !department.isBlank() && !department.equalsIgnoreCase("ALL")) {
            sql.append(" AND UPPER(department) = UPPER(?)");
            params.add(department);
        }

        if (action != null && !action.isBlank() && !action.equalsIgnoreCase("ALL")) {
            sql.append(" AND UPPER(action) = UPPER(?)");
            params.add(action);
        }

        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(actor_email) LIKE ? OR LOWER(actor_name) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(resource_name) LIKE ? OR LOWER(resource_type) LIKE ?)");
            String term = "%" + search.toLowerCase() + "%";
            params.add(term);
            params.add(term);
            params.add(term);
            params.add(term);
            params.add(term);
        }

        sql.append(" ORDER BY created_at DESC");

        if (limit != null && limit > 0) {
            sql.append(" LIMIT ?");
            params.add(limit);
        } else {
            sql.append(" LIMIT 500");
        }

        return jdbcTemplate.query(sql.toString(), rowMapper, params.toArray());
    }

    private final RowMapper<AuditLog> rowMapper = (rs, rowNum) -> {
        AuditLog log = new AuditLog();
        log.setId(rs.getObject("id", UUID.class));
        log.setActorId(rs.getObject("actor_id", UUID.class));
        log.setActorEmail(rs.getString("actor_email"));
        log.setActorName(rs.getString("actor_name"));
        log.setDepartment(rs.getString("department"));
        log.setAction(rs.getString("action"));
        log.setResourceType(rs.getString("resource_type"));
        log.setResourceId(rs.getObject("resource_id", UUID.class));
        log.setResourceName(rs.getString("resource_name"));
        log.setSummary(rs.getString("summary"));
        
        String scopeTypeStr = rs.getString("scope_type");
        if (scopeTypeStr != null) {
            try {
                log.setScopeType(ScopeType.valueOf(scopeTypeStr));
            } catch (IllegalArgumentException e) {
                log.setScopeType(ScopeType.GLOBAL);
            }
        }
        
        log.setScopeId(rs.getObject("scope_id", UUID.class));
        log.setStateChanges(rs.getString("state_changes"));
        log.setIpAddress(rs.getString("ip_address"));
        log.setUserAgent(rs.getString("user_agent"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) {
            log.setCreatedAt(ts.toLocalDateTime());
        }
        return log;
    };
}
