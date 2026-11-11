package com.charityapp.repository.auth;

import com.charityapp.model.auth.Membership;
import com.charityapp.model.auth.ScopeType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class MembershipRepository {
    private final JdbcTemplate jdbcTemplate;

    public MembershipRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Membership save(Membership membership) {
        if (membership.getId() == null) {
            membership.setId(UUID.randomUUID());
        }

        String sql = """
            INSERT INTO auth.memberships (id, user_id, role_id, scope_type, scope_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """;

        jdbcTemplate.update(sql,
            membership.getId(),
            membership.getUserId(),
            membership.getRoleId(),
            membership.getScopeType().name(),
            membership.getScopeId(),
            Timestamp.valueOf(membership.getCreatedAt())
        );

        return membership;
    }

    public void delete(UUID id) {
        jdbcTemplate.update("DELETE FROM auth.memberships WHERE id = ?", id);
    }

    public Optional<Membership> findById(UUID id) {
        String sql = "SELECT * FROM auth.memberships WHERE id = ?";
        List<Membership> list = jdbcTemplate.query(sql, rowMapper, id);
        return list.stream().findFirst();
    }

    public List<Membership> findByUserId(UUID userId) {
        String sql = "SELECT * FROM auth.memberships WHERE user_id = ?";
        return jdbcTemplate.query(sql, rowMapper, userId);
    }

    public List<Membership> findByUserIdAndScope(UUID userId, ScopeType scopeType, UUID scopeId) {
        if (scopeId == null) {
            String sql = "SELECT * FROM auth.memberships WHERE user_id = ? AND scope_type = ? AND scope_id IS NULL";
            return jdbcTemplate.query(sql, rowMapper, userId, scopeType.name());
        } else {
            String sql = "SELECT * FROM auth.memberships WHERE user_id = ? AND scope_type = ? AND scope_id = ?";
            return jdbcTemplate.query(sql, rowMapper, userId, scopeType.name(), scopeId);
        }
    }

    private final RowMapper<Membership> rowMapper = (rs, rowNum) -> {
        Membership membership = new Membership();
        membership.setId(rs.getObject("id", UUID.class));
        membership.setUserId(rs.getObject("user_id", UUID.class));
        membership.setRoleId(rs.getObject("role_id", UUID.class));
        membership.setScopeType(ScopeType.valueOf(rs.getString("scope_type")));
        membership.setScopeId(rs.getObject("scope_id", UUID.class));
        membership.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return membership;
    };
}
