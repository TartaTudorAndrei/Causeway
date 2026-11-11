package com.charityapp.repository.project;

import com.charityapp.model.project.Project;
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
public class ProjectRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProjectRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Project> rowMapper = (rs, rowNum) -> {
        Project p = new Project();
        p.setId(rs.getObject("id", UUID.class));
        p.setEntityId(rs.getObject("entity_id", UUID.class));
        p.setName(rs.getString("name"));
        p.setSlug(rs.getString("slug"));
        p.setDescription(rs.getString("description"));
        p.setTemplatePreset(rs.getString("template_preset"));
        p.setStatus(rs.getString("status"));
        p.setCreatedBy(rs.getObject("created_by", UUID.class));

        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) {
            p.setCreatedAt(cat.toInstant().atOffset(ZoneOffset.UTC));
        }
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) {
            p.setUpdatedAt(uat.toInstant().atOffset(ZoneOffset.UTC));
        }
        return p;
    };

    public List<Project> findAll() {
        String sql = "SELECT * FROM projects.projects ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public List<Project> findByEntityId(UUID entityId) {
        String sql = "SELECT * FROM projects.projects WHERE entity_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, rowMapper, entityId);
    }

    public Optional<Project> findById(UUID id) {
        String sql = "SELECT * FROM projects.projects WHERE id = ?";
        List<Project> list = jdbcTemplate.query(sql, rowMapper, id);
        return list.stream().findFirst();
    }

    public Optional<Project> findBySlug(String slug) {
        String sql = "SELECT * FROM projects.projects WHERE LOWER(slug) = LOWER(?)";
        List<Project> list = jdbcTemplate.query(sql, rowMapper, slug);
        return list.stream().findFirst();
    }

    public boolean existsBySlug(String slug) {
        String sql = "SELECT COUNT(*) FROM projects.projects WHERE LOWER(slug) = LOWER(?)";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, slug);
        return count != null && count > 0;
    }

    public Project save(Project project) {
        if (project.getId() == null) {
            project.setId(UUID.randomUUID());
        }
        if (project.getCreatedAt() == null) {
            project.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        if (project.getUpdatedAt() == null) {
            project.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }

        String sql = """
            INSERT INTO projects.projects
            (id, entity_id, name, slug, description, template_preset, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                entity_id = EXCLUDED.entity_id,
                name = EXCLUDED.name,
                slug = EXCLUDED.slug,
                description = EXCLUDED.description,
                template_preset = EXCLUDED.template_preset,
                status = EXCLUDED.status,
                updated_at = CURRENT_TIMESTAMP
            """;

        jdbcTemplate.update(sql,
            project.getId(),
            project.getEntityId(),
            project.getName(),
            project.getSlug(),
            project.getDescription(),
            project.getTemplatePreset(),
            project.getStatus(),
            project.getCreatedBy(),
            Timestamp.from(project.getCreatedAt().toInstant()),
            Timestamp.from(project.getUpdatedAt().toInstant())
        );

        return project;
    }

    public void update(Project project) {
        String sql = """
            UPDATE projects.projects
            SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbcTemplate.update(sql, project.getName(), project.getDescription(), project.getStatus(), project.getId());
    }

    public void delete(UUID id) {
        jdbcTemplate.update("DELETE FROM projects.projects WHERE id = ?", id);
    }
}
