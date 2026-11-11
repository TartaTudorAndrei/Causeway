package com.charityapp.repository.auth;

import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AuthProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Repository
public class AdminUserRepository {
    private static final Logger log = LoggerFactory.getLogger(AdminUserRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public AdminUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public AdminUser save(AdminUser user) {
        if (user.getId() == null) {
            user.setId(UUID.randomUUID());
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        if (user.getUpdatedAt() == null) {
            user.setUpdatedAt(LocalDateTime.now());
        }

        String rolesStr = user.getRoles() != null && !user.getRoles().isEmpty()
            ? String.join(",", user.getRoles())
            : (user.getRole() != null ? user.getRole() : "VOLUNTEER");

        String sql = """
            INSERT INTO auth.admin_users 
            (id, full_name, email, password_hash, status, role, roles, phone, organization_type, organization_details, notes, last_login_at, two_factor_enabled, two_factor_secret, two_factor_method, token_version, auth_provider, whatsapp_notifications_enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        try {
            int rows = jdbcTemplate.update(sql,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getStatus().name(),
                user.getRole(),
                rolesStr,
                user.getPhone(),
                user.getOrganizationType(),
                user.getOrganizationDetails(),
                user.getNotes(),
                user.getLastLoginAt() != null ? Timestamp.valueOf(user.getLastLoginAt()) : null,
                user.isTwoFactorEnabled(),
                user.getTwoFactorSecret(),
                user.getTwoFactorMethod() != null ? user.getTwoFactorMethod() : "NONE",
                user.getTokenVersion(),
                user.getAuthProvider() != null ? user.getAuthProvider().name() : "LOCAL",
                user.isWhatsappNotificationsEnabled(),
                Timestamp.valueOf(user.getCreatedAt()),
                Timestamp.valueOf(user.getUpdatedAt())
            );
            log.info("Successfully inserted admin user {} (rows={})", user.getEmail(), rows);
        } catch (Exception e) {
            log.error("Failed to insert admin user {}: {}", user.getEmail(), e.getMessage(), e);
            throw e;
        }

        return user;
    }

    public List<AdminUser> findAll() {
        String sql = "SELECT * FROM auth.admin_users ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public Optional<AdminUser> findByEmail(String email) {
        String sql = "SELECT * FROM auth.admin_users WHERE LOWER(email) = LOWER(?)";
        List<AdminUser> users = jdbcTemplate.query(sql, rowMapper, email);
        return users.stream().findFirst();
    }

    public Optional<AdminUser> findByFullName(String fullName) {
        String sql = "SELECT * FROM auth.admin_users WHERE LOWER(full_name) = LOWER(?)";
        List<AdminUser> users = jdbcTemplate.query(sql, rowMapper, fullName);
        return users.stream().findFirst();
    }

    public Optional<AdminUser> findById(UUID id) {
        String sql = "SELECT * FROM auth.admin_users WHERE id = ?";
        List<AdminUser> users = jdbcTemplate.query(sql, rowMapper, id);
        return users.stream().findFirst();
    }

    public void updateStatus(UUID id, AdminStatus status) {
        String sql = "UPDATE auth.admin_users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, status.name(), id);
    }

    public void updateStatusAndNotes(UUID id, AdminStatus status, String notes) {
        try {
            String sql = "UPDATE auth.admin_users SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            jdbcTemplate.update(sql, status.name(), notes, id);
        } catch (Exception e) {
            String sql = "UPDATE auth.admin_users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            jdbcTemplate.update(sql, status.name(), id);
        }
    }

    public void updateUser(AdminUser user) {
        String rolesStr = user.getRoles() != null && !user.getRoles().isEmpty()
            ? String.join(",", user.getRoles())
            : (user.getRole() != null ? user.getRole() : "VOLUNTEER");

        String sql = """
            UPDATE auth.admin_users 
            SET full_name = ?, password_hash = ?, role = ?, roles = ?, phone = ?, organization_type = ?, organization_details = ?, notes = ?, two_factor_enabled = ?, two_factor_secret = ?, two_factor_method = ?, auth_provider = ?, whatsapp_notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbcTemplate.update(sql,
            user.getFullName(),
            user.getPasswordHash(),
            user.getRole(),
            rolesStr,
            user.getPhone(),
            user.getOrganizationType(),
            user.getOrganizationDetails(),
            user.getNotes(),
            user.isTwoFactorEnabled(),
            user.getTwoFactorSecret(),
            user.getTwoFactorMethod() != null ? user.getTwoFactorMethod() : "NONE",
            user.getAuthProvider() != null ? user.getAuthProvider().name() : "LOCAL",
            user.isWhatsappNotificationsEnabled(),
            user.getId()
        );
    }

    public void updateWhatsappNotificationsEnabled(UUID id, boolean enabled) {
        String sql = "UPDATE auth.admin_users SET whatsapp_notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, enabled, id);
    }

    public void updateTwoFactor(UUID id, boolean enabled, String secret, String method) {
        String sql = "UPDATE auth.admin_users SET two_factor_enabled = ?, two_factor_secret = ?, two_factor_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, enabled, secret, method != null ? method : "NONE", id);
    }

    public void updatePassword(UUID id, String passwordHash) {
        String sql = "UPDATE auth.admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, passwordHash, id);
    }

    public void updateRole(UUID id, String role) {
        String r = role != null && !role.isBlank() ? role.trim() : "VOLUNTEER";
        String sql = "UPDATE auth.admin_users SET role = ?, roles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, r, r, id);
    }

    public void updateRole(UUID id, AdminRole role) {
        updateRole(id, role != null ? role.name() : "VOLUNTEER");
    }

    public void updateRoles(UUID id, String primaryRole, List<String> roles) {
        String rolesStr = roles != null && !roles.isEmpty()
            ? String.join(",", roles.stream().map(String::trim).filter(s -> !s.isEmpty()).toList())
            : (primaryRole != null ? primaryRole.trim() : "VOLUNTEER");
        String pRole = primaryRole != null && !primaryRole.isBlank()
            ? primaryRole.trim()
            : (roles != null && !roles.isEmpty() ? roles.get(0).trim() : "VOLUNTEER");

        String sql = "UPDATE auth.admin_users SET role = ?, roles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, pRole, rolesStr, id);
    }

    public void updateRoles(UUID id, AdminRole primaryRole, List<?> roles) {
        String pRole = primaryRole != null ? primaryRole.name() : "VOLUNTEER";
        List<String> rList = roles != null
            ? roles.stream().map(r -> r instanceof AdminRole ar ? ar.name() : String.valueOf(r).trim()).filter(s -> !s.isEmpty()).toList()
            : List.of(pRole);
        updateRoles(id, pRole, rList);
    }

    public void updateLastLogin(UUID id, LocalDateTime lastLoginAt) {
        try {
            String sql = "UPDATE auth.admin_users SET last_login_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            jdbcTemplate.update(sql, Timestamp.valueOf(lastLoginAt), id);
        } catch (Exception e) {
            String sql = "UPDATE auth.admin_users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            jdbcTemplate.update(sql, id);
        }
    }

    public void incrementTokenVersion(UUID id) {
        String sql = "UPDATE auth.admin_users SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public void deleteById(UUID id) {
        String sql = "DELETE FROM auth.admin_users WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public List<AdminUser> findPendingApproval() {
        String sql = "SELECT * FROM auth.admin_users WHERE status = 'PENDING_APPROVAL' ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    private final RowMapper<AdminUser> rowMapper = (rs, rowNum) -> {
        AdminUser user = new AdminUser();
        user.setId(rs.getObject("id", UUID.class));
        user.setFullName(rs.getString("full_name"));
        user.setEmail(rs.getString("email"));
        user.setPasswordHash(rs.getString("password_hash"));
        user.setStatus(AdminStatus.fromString(rs.getString("status")));
        
        String primaryRole = rs.getString("role");
        if (primaryRole == null || primaryRole.isBlank()) {
            primaryRole = "VOLUNTEER";
        } else {
            primaryRole = primaryRole.trim();
        }
        user.setRole(primaryRole);

        String rolesRaw = getStringOptional(rs, "roles");
        if (rolesRaw != null && !rolesRaw.isBlank()) {
            List<String> parsedRoles = java.util.Arrays.stream(rolesRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
            if (!parsedRoles.isEmpty()) {
                user.setRoles(parsedRoles);
            } else {
                user.setRoles(List.of(primaryRole));
            }
        } else {
            user.setRoles(List.of(primaryRole));
        }

        user.setPhone(getStringOptional(rs, "phone"));
        user.setOrganizationType(getStringOptional(rs, "organization_type"));
        user.setOrganizationDetails(getStringOptional(rs, "organization_details"));
        user.setNotes(getStringOptional(rs, "notes"));

        user.setTwoFactorEnabled(getBooleanOptional(rs, "two_factor_enabled"));
        user.setTwoFactorSecret(getStringOptional(rs, "two_factor_secret"));
        String method = getStringOptional(rs, "two_factor_method");
        user.setTwoFactorMethod(method != null ? method : "NONE");
        user.setTokenVersion(getIntOptional(rs, "token_version"));
        user.setAuthProvider(AuthProvider.fromString(getStringOptional(rs, "auth_provider")));
        user.setWhatsappNotificationsEnabled(getBooleanDefaultTrue(rs, "whatsapp_notifications_enabled"));

        Timestamp lastLogin = getTimestampOptional(rs, "last_login_at");
        if (lastLogin != null) {
            user.setLastLoginAt(lastLogin.toLocalDateTime());
        }

        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) {
            user.setCreatedAt(createdAt.toLocalDateTime());
        }
        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) {
            user.setUpdatedAt(updatedAt.toLocalDateTime());
        }
        return user;
    };

    private boolean getBooleanOptional(ResultSet rs, String colName) {
        try {
            return rs.getBoolean(colName);
        } catch (SQLException e) {
            return false;
        }
    }

    private boolean getBooleanDefaultTrue(ResultSet rs, String colName) {
        try {
            boolean val = rs.getBoolean(colName);
            return rs.wasNull() ? true : val;
        } catch (SQLException e) {
            return true;
        }
    }

    private String getStringOptional(ResultSet rs, String colName) {
        try {
            return rs.getString(colName);
        } catch (SQLException e) {
            return null;
        }
    }

    private Timestamp getTimestampOptional(ResultSet rs, String colName) {
        try {
            return rs.getTimestamp(colName);
        } catch (SQLException e) {
            return null;
        }
    }

    private int getIntOptional(ResultSet rs, String colName) {
        try {
            return rs.getInt(colName);
        } catch (SQLException e) {
            return 0;
        }
    }
}
