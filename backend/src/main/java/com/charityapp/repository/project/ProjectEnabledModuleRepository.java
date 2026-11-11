package com.charityapp.repository.project;

import com.charityapp.model.project.ProjectEnabledModule;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ProjectEnabledModuleRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProjectEnabledModuleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<ProjectEnabledModule> rowMapper = (rs, rowNum) -> {
        ProjectEnabledModule m = new ProjectEnabledModule();
        m.setId(rs.getObject("id", UUID.class));
        m.setProjectId(rs.getObject("project_id", UUID.class));
        m.setModuleId(rs.getString("module_id"));
        m.setActive(rs.getBoolean("is_active"));
        m.setConfigJson(rs.getString("config_json"));
        m.setEnabledBy(rs.getObject("enabled_by", UUID.class));

        Timestamp eat = rs.getTimestamp("enabled_at");
        if (eat != null) {
            m.setEnabledAt(eat.toInstant().atOffset(ZoneOffset.UTC));
        }
        return m;
    };

    public List<ProjectEnabledModule> findByProjectId(UUID projectId) {
        String sql = "SELECT * FROM projects.project_enabled_modules WHERE project_id = ? ORDER BY module_id ASC";
        return jdbcTemplate.query(sql, rowMapper, projectId);
    }

    public List<ProjectEnabledModule> findActiveByProjectId(UUID projectId) {
        String sql = "SELECT * FROM projects.project_enabled_modules WHERE project_id = ? AND is_active = TRUE ORDER BY module_id ASC";
        return jdbcTemplate.query(sql, rowMapper, projectId);
    }

    public Optional<ProjectEnabledModule> findByProjectIdAndModuleId(UUID projectId, String moduleId) {
        String sql = "SELECT * FROM projects.project_enabled_modules WHERE project_id = ? AND module_id = ?";
        List<ProjectEnabledModule> list = jdbcTemplate.query(sql, rowMapper, projectId, moduleId);
        return list.stream().findFirst();
    }

    public boolean isModuleActive(UUID projectId, String moduleId) {
        String sql = "SELECT COUNT(*) FROM projects.project_enabled_modules WHERE project_id = ? AND module_id = ? AND is_active = TRUE";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, projectId, moduleId);
        return count != null && count > 0;
    }

    public ProjectEnabledModule save(ProjectEnabledModule module) {
        if (module.getId() == null) {
            module.setId(UUID.randomUUID());
        }
        if (module.getEnabledAt() == null) {
            module.setEnabledAt(OffsetDateTime.now(ZoneOffset.UTC));
        }

        String sql = """
            INSERT INTO projects.project_enabled_modules
            (id, project_id, module_id, is_active, config_json, enabled_at, enabled_by)
            VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)
            ON CONFLICT (project_id, module_id) DO UPDATE SET
                is_active = EXCLUDED.is_active,
                config_json = EXCLUDED.config_json,
                enabled_at = EXCLUDED.enabled_at,
                enabled_by = EXCLUDED.enabled_by
            """;

        jdbcTemplate.update(sql,
            module.getId(),
            module.getProjectId(),
            module.getModuleId(),
            module.isActive(),
            module.getConfigJson() != null ? module.getConfigJson() : "{}",
            Timestamp.from(module.getEnabledAt().toInstant()),
            module.getEnabledBy()
        );

        return module;
    }

    public void deactivate(UUID projectId, String moduleId) {
        String sql = "UPDATE projects.project_enabled_modules SET is_active = FALSE WHERE project_id = ? AND module_id = ?";
        jdbcTemplate.update(sql, projectId, moduleId);
    }

    public void deleteByProjectId(UUID projectId) {
        jdbcTemplate.update("DELETE FROM projects.project_enabled_modules WHERE project_id = ?", projectId);
    }
}
