package com.charityapp.repository.auth;

import com.charityapp.model.auth.Approval;
import com.charityapp.model.auth.ApprovalStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

@Repository
public class ApprovalRepository {
    private final JdbcTemplate jdbcTemplate;

    public ApprovalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Approval save(Approval approval) {
        if (approval.getId() == null) {
            approval.setId(UUID.randomUUID());
        }

        String sql = """
            INSERT INTO auth.approvals (id, request_id, approver_id, decision, comments, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """;

        jdbcTemplate.update(sql,
            approval.getId(),
            approval.getRequestId(),
            approval.getApproverId(),
            approval.getDecision().name(),
            approval.getComments(),
            Timestamp.valueOf(approval.getCreatedAt())
        );

        return approval;
    }

    public List<Approval> findByRequestId(UUID requestId) {
        String sql = "SELECT * FROM auth.approvals WHERE request_id = ? ORDER BY created_at ASC";
        return jdbcTemplate.query(sql, rowMapper, requestId);
    }

    private final RowMapper<Approval> rowMapper = (rs, rowNum) -> {
        Approval approval = new Approval();
        approval.setId(rs.getObject("id", UUID.class));
        approval.setRequestId(rs.getObject("request_id", UUID.class));
        approval.setApproverId(rs.getObject("approver_id", UUID.class));
        approval.setDecision(ApprovalStatus.valueOf(rs.getString("decision")));
        approval.setComments(rs.getString("comments"));
        approval.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return approval;
    };
}
