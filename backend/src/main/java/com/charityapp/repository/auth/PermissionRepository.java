package com.charityapp.repository.auth;

import com.charityapp.model.auth.Permission;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class PermissionRepository {
    private final JdbcTemplate jdbcTemplate;

    public PermissionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Permission save(Permission perm) {
        if (perm.getId() == null) {
            perm.setId(UUID.randomUUID());
        }

        String sql = """
            INSERT INTO auth.permissions (id, code, description, category, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (code) DO UPDATE 
            SET description = EXCLUDED.description,
                category = EXCLUDED.category
            """;

        jdbcTemplate.update(sql,
            perm.getId(),
            perm.getCode(),
            perm.getDescription(),
            perm.getCategory() != null ? perm.getCategory() : "GENERAL",
            Timestamp.valueOf(perm.getCreatedAt())
        );

        return perm;
    }

    public Optional<Permission> findById(UUID id) {
        String sql = "SELECT * FROM auth.permissions WHERE id = ?";
        List<Permission> perms = jdbcTemplate.query(sql, rowMapper, id);
        return perms.stream().findFirst();
    }

    public Optional<Permission> findByCode(String code) {
        String sql = "SELECT * FROM auth.permissions WHERE code = ?";
        List<Permission> perms = jdbcTemplate.query(sql, rowMapper, code);
        return perms.stream().findFirst();
    }

    public List<Permission> findAll() {
        String sql = "SELECT * FROM auth.permissions ORDER BY category ASC, code ASC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public List<Permission> findByRoleId(UUID roleId) {
        String sql = """
            SELECT p.* FROM auth.permissions p
            JOIN auth.role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.category ASC, p.code ASC
            """;
        return jdbcTemplate.query(sql, rowMapper, roleId);
    }

    public List<Permission> findByRoleName(String roleName) {
        String sql = """
            SELECT p.* FROM auth.permissions p
            JOIN auth.role_permissions rp ON p.id = rp.permission_id
            JOIN auth.roles r ON rp.role_id = r.id
            WHERE r.name = ?
            ORDER BY p.category ASC, p.code ASC
            """;
        return jdbcTemplate.query(sql, rowMapper, roleName);
    }

    public List<String> findPermissionCodesByRoleNames(List<String> roleNames) {
        if (roleNames == null || roleNames.isEmpty()) return List.of();
        String inSql = String.join(",", java.util.Collections.nCopies(roleNames.size(), "?"));
        String sql = "SELECT DISTINCT p.code FROM auth.permissions p " +
                     "JOIN auth.role_permissions rp ON p.id = rp.permission_id " +
                     "JOIN auth.roles r ON rp.role_id = r.id " +
                     "WHERE r.name IN (" + inSql + ")";
        return jdbcTemplate.queryForList(sql, String.class, roleNames.toArray());
    }

    public boolean hasAnyRolePermissionsConfigured(String roleName) {
        String sql = """
            SELECT COUNT(*) FROM auth.role_permissions rp
            JOIN auth.roles r ON rp.role_id = r.id
            WHERE r.name = ?
            """;
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, roleName);
        return count != null && count > 0;
    }

    public void saveRolePermissions(UUID roleId, List<UUID> permissionIds) {
        jdbcTemplate.update("DELETE FROM auth.role_permissions WHERE role_id = ?", roleId);

        if (permissionIds != null && !permissionIds.isEmpty()) {
            String sql = "INSERT INTO auth.role_permissions (role_id, permission_id) VALUES (?, ?)";
            for (UUID permId : permissionIds) {
                jdbcTemplate.update(sql, roleId, permId);
            }
        }
    }

    private final RowMapper<Permission> rowMapper = (rs, rowNum) -> {
        Permission perm = new Permission();
        perm.setId(rs.getObject("id", UUID.class));
        perm.setCode(rs.getString("code"));
        perm.setDescription(rs.getString("description"));
        try {
            perm.setCategory(rs.getString("category") != null ? rs.getString("category") : "GENERAL");
        } catch (Exception ignored) {
            perm.setCategory("GENERAL");
        }
        perm.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return perm;
    };
}
