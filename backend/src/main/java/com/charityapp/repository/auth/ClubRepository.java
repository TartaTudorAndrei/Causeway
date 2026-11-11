package com.charityapp.repository.auth;

import com.charityapp.model.auth.Club;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ClubRepository {

    private final JdbcTemplate jdbcTemplate;

    public ClubRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Club> rowMapper = (rs, rowNum) -> {
        Club c = new Club();
        c.setId(UUID.fromString(rs.getString("id")));
        c.setName(rs.getString("name"));
        c.setOrganizationType(rs.getString("organization_type"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) c.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) c.setUpdatedAt(uat.toLocalDateTime());
        return c;
    };

    public List<Club> findAll() {
        String sql = "SELECT * FROM auth.clubs ORDER BY organization_type ASC, name ASC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public List<Club> findByOrganizationType(String orgType) {
        String sql = "SELECT * FROM auth.clubs WHERE LOWER(organization_type) = LOWER(?) ORDER BY name ASC";
        return jdbcTemplate.query(sql, rowMapper, orgType);
    }

    public Optional<Club> findByName(String name) {
        String sql = "SELECT * FROM auth.clubs WHERE LOWER(name) = LOWER(?)";
        List<Club> res = jdbcTemplate.query(sql, rowMapper, name);
        return res.stream().findFirst();
    }

    public Club save(Club club) {
        if (club.getId() == null) {
            club.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO auth.clubs (id, name, organization_type, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
            ON CONFLICT (name) DO UPDATE SET
                organization_type = EXCLUDED.organization_type,
                updated_at = NOW()
            """;
        jdbcTemplate.update(sql, club.getId(), club.getName(), club.getOrganizationType());
        return club;
    }

    public void delete(UUID id) {
        jdbcTemplate.update("DELETE FROM auth.clubs WHERE id = ?", id);
    }
}
