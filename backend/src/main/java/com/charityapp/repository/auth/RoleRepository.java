package com.charityapp.repository.auth;

import com.charityapp.model.auth.Role;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class RoleRepository {
    private final JdbcTemplate jdbcTemplate;

    public RoleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Role save(Role role) {
        if (role.getId() == null) {
            role.setId(UUID.randomUUID());
        }
        if (role.getCreatedAt() == null) {
            role.setCreatedAt(java.time.LocalDateTime.now());
        }
        if (role.getUpdatedAt() == null) {
            role.setUpdatedAt(java.time.LocalDateTime.now());
        }

        String sql = """
            INSERT INTO auth.roles (id, name, description, is_system, created_by, parent_role_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (name) DO UPDATE
            SET description = EXCLUDED.description,
                is_system = EXCLUDED.is_system,
                created_by = COALESCE(EXCLUDED.created_by, auth.roles.created_by),
                parent_role_id = COALESCE(EXCLUDED.parent_role_id, auth.roles.parent_role_id),
                updated_at = CURRENT_TIMESTAMP
            """;

        jdbcTemplate.update(sql,
            role.getId(),
            role.getName(),
            role.getDescription(),
            role.isSystem(),
            role.getCreatedBy(),
            role.getParentRoleId(),
            Timestamp.valueOf(role.getCreatedAt()),
            Timestamp.valueOf(role.getUpdatedAt())
        );

        return role;
    }

    public Optional<Role> findById(UUID id) {
        String sql = "SELECT * FROM auth.roles WHERE id = ?";
        List<Role> roles = jdbcTemplate.query(sql, rowMapper, id);
        return roles.stream().findFirst();
    }

    public Optional<Role> findByName(String name) {
        String sql = "SELECT * FROM auth.roles WHERE name = ?";
        List<Role> roles = jdbcTemplate.query(sql, rowMapper, name);
        return roles.stream().findFirst();
    }

    public List<Role> findAll() {
        String sql = "SELECT * FROM auth.roles ORDER BY is_system DESC, name ASC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public void deleteById(UUID id) {
        jdbcTemplate.update("DELETE FROM auth.roles WHERE id = ?", id);
    }

    public int countUsersAssignedToRole(String roleName) {
        String sql = """
            SELECT COUNT(*) FROM auth.admin_users 
            WHERE role = ? 
               OR roles LIKE ? 
               OR roles LIKE ? 
               OR roles LIKE ? 
               OR roles = ?
            """;
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class,
                roleName,
                "%," + roleName + ",%",
                roleName + ",%",
                "%," + roleName,
                roleName);
        return count != null ? count : 0;
    }

    private final RowMapper<Role> rowMapper = (rs, rowNum) -> {
        Role role = new Role();
        role.setId(rs.getObject("id", UUID.class));
        role.setName(rs.getString("name"));
        try {
            role.setDescription(rs.getString("description"));
        } catch (Exception ignored) {}
        try {
            role.setSystem(rs.getBoolean("is_system"));
        } catch (Exception ignored) {}
        try {
            role.setCreatedBy(rs.getObject("created_by", UUID.class));
        } catch (Exception ignored) {}
        try {
            role.setParentRoleId(rs.getObject("parent_role_id", UUID.class));
        } catch (Exception ignored) {}
        try {
            Timestamp cat = rs.getTimestamp("created_at");
            if (cat != null) role.setCreatedAt(cat.toLocalDateTime());
        } catch (Exception ignored) {}
        try {
            Timestamp uat = rs.getTimestamp("updated_at");
            if (uat != null) role.setUpdatedAt(uat.toLocalDateTime());
        } catch (Exception ignored) {}
        return role;
    };
}
