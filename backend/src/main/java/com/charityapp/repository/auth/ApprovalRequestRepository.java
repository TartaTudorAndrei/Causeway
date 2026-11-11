package com.charityapp.repository.auth;

import com.charityapp.model.auth.ApprovalRequest;
import com.charityapp.model.auth.ApprovalStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ApprovalRequestRepository {
    private final JdbcTemplate jdbcTemplate;

    public ApprovalRequestRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ApprovalRequest save(ApprovalRequest request) {
        if (request.getId() == null) {
            request.setId(UUID.randomUUID());
        }

        String sql = """
            INSERT INTO auth.approval_requests (id, requester_id, action_type, payload, status, required_permission, created_at, updated_at)
            VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE 
            SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
            """;

        jdbcTemplate.update(sql,
            request.getId(),
            request.getRequesterId(),
            request.getActionType(),
            request.getPayload(),
            request.getStatus().name(),
            request.getRequiredPermission(),
            Timestamp.valueOf(request.getCreatedAt()),
            Timestamp.valueOf(request.getUpdatedAt())
        );

        return request;
    }

    public Optional<ApprovalRequest> findById(UUID id) {
        String sql = "SELECT * FROM auth.approval_requests WHERE id = ?";
        List<ApprovalRequest> list = jdbcTemplate.query(sql, rowMapper, id);
        return list.stream().findFirst();
    }

    public List<ApprovalRequest> findByStatus(ApprovalStatus status) {
        String sql = "SELECT * FROM auth.approval_requests WHERE status = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper, status.name());
    }

    public void updateStatus(UUID id, ApprovalStatus status) {
        String sql = "UPDATE auth.approval_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, status.name(), id);
    }

    private final RowMapper<ApprovalRequest> rowMapper = (rs, rowNum) -> {
        ApprovalRequest request = new ApprovalRequest();
        request.setId(rs.getObject("id", UUID.class));
        request.setRequesterId(rs.getObject("requester_id", UUID.class));
        request.setActionType(rs.getString("action_type"));
        request.setPayload(rs.getString("payload"));
        request.setStatus(ApprovalStatus.valueOf(rs.getString("status")));
        request.setRequiredPermission(rs.getString("required_permission"));
        request.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        request.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return request;
    };
}
