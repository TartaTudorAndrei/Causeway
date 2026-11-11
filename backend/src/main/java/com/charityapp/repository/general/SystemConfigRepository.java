package com.charityapp.repository.general;

import com.charityapp.model.general.SystemConfig;
import com.charityapp.model.general.SystemConfigSnapshot;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SystemConfigRepository {

    private final JdbcTemplate jdbcTemplate;

    public SystemConfigRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<SystemConfig> configRowMapper = (rs, rowNum) -> {
        SystemConfig c = new SystemConfig();
        c.setConfigKey(rs.getString("config_key"));
        c.setCategory(rs.getString("category"));
        c.setConfigValue(rs.getString("config_value"));
        c.setEncryptedValue(rs.getString("encrypted_value"));
        c.setDataType(rs.getString("data_type"));
        c.setSecret(rs.getBoolean("is_secret"));
        c.setRequiresRestart(rs.getBoolean("requires_restart"));
        c.setDescriptionRo(rs.getString("description_ro"));
        c.setDescriptionEn(rs.getString("description_en"));

        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) c.setCreatedAt(createdAt.toLocalDateTime());

        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) c.setUpdatedAt(updatedAt.toLocalDateTime());

        c.setUpdatedBy(rs.getObject("updated_by", UUID.class));
        return c;
    };

    private final RowMapper<SystemConfigSnapshot> snapshotRowMapper = (rs, rowNum) -> {
        SystemConfigSnapshot s = new SystemConfigSnapshot();
        s.setId(rs.getObject("id", UUID.class));
        s.setSnapshotLabel(rs.getString("snapshot_label"));
        s.setConfigPayload(rs.getString("config_payload"));

        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) s.setCreatedAt(createdAt.toLocalDateTime());

        s.setCreatedBy(rs.getObject("created_by", UUID.class));
        return s;
    };

    public List<SystemConfig> findAll() {
        String sql = "SELECT * FROM general.system_configurations ORDER BY category ASC, config_key ASC";
        return jdbcTemplate.query(sql, configRowMapper);
    }

    public List<SystemConfig> findByCategory(String category) {
        String sql = "SELECT * FROM general.system_configurations WHERE category = ? ORDER BY config_key ASC";
        return jdbcTemplate.query(sql, configRowMapper, category);
    }

    public Optional<SystemConfig> findByKey(String configKey) {
        String sql = "SELECT * FROM general.system_configurations WHERE config_key = ?";
        List<SystemConfig> list = jdbcTemplate.query(sql, configRowMapper, configKey);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public void upsert(SystemConfig config) {
        String sql = """
            INSERT INTO general.system_configurations 
            (config_key, category, config_value, encrypted_value, data_type, is_secret, requires_restart, description_ro, description_en, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (config_key) DO UPDATE SET
                category = EXCLUDED.category,
                config_value = EXCLUDED.config_value,
                encrypted_value = EXCLUDED.encrypted_value,
                data_type = EXCLUDED.data_type,
                is_secret = EXCLUDED.is_secret,
                requires_restart = EXCLUDED.requires_restart,
                description_ro = COALESCE(EXCLUDED.description_ro, general.system_configurations.description_ro),
                description_en = COALESCE(EXCLUDED.description_en, general.system_configurations.description_en),
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
            """;

        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(sql,
            config.getConfigKey(),
            config.getCategory(),
            config.getConfigValue(),
            config.getEncryptedValue(),
            config.getDataType() != null ? config.getDataType() : "STRING",
            config.isSecret(),
            config.isRequiresRestart(),
            config.getDescriptionRo(),
            config.getDescriptionEn(),
            Timestamp.valueOf(config.getCreatedAt() != null ? config.getCreatedAt() : now),
            Timestamp.valueOf(now),
            config.getUpdatedBy()
        );
    }

    public void updateValue(String configKey, String configValue, String encryptedValue, UUID updatedBy) {
        String sql = """
            UPDATE general.system_configurations
            SET config_value = ?,
                encrypted_value = ?,
                updated_at = NOW(),
                updated_by = ?
            WHERE config_key = ?
            """;
        jdbcTemplate.update(sql, configValue, encryptedValue, updatedBy, configKey);
    }

    public void deleteByKey(String configKey) {
        String sql = "DELETE FROM general.system_configurations WHERE config_key = ?";
        jdbcTemplate.update(sql, configKey);
    }

    // Snapshots
    public void saveSnapshot(SystemConfigSnapshot snapshot) {
        String sql = """
            INSERT INTO general.system_configuration_snapshots
            (id, snapshot_label, config_payload, created_at, created_by)
            VALUES (?, ?, ?::jsonb, ?, ?)
            """;
        if (snapshot.getId() == null) {
            snapshot.setId(UUID.randomUUID());
        }
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(sql,
            snapshot.getId(),
            snapshot.getSnapshotLabel(),
            snapshot.getConfigPayload(),
            Timestamp.valueOf(snapshot.getCreatedAt() != null ? snapshot.getCreatedAt() : now),
            snapshot.getCreatedBy()
        );
    }

    public List<SystemConfigSnapshot> findAllSnapshots() {
        String sql = "SELECT * FROM general.system_configuration_snapshots ORDER BY created_at DESC LIMIT 50";
        return jdbcTemplate.query(sql, snapshotRowMapper);
    }

    public Optional<SystemConfigSnapshot> findSnapshotById(UUID id) {
        String sql = "SELECT * FROM general.system_configuration_snapshots WHERE id = ?";
        List<SystemConfigSnapshot> list = jdbcTemplate.query(sql, snapshotRowMapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
