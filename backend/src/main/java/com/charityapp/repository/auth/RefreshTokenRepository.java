package com.charityapp.repository.auth;

import com.charityapp.model.auth.RefreshToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class RefreshTokenRepository {

    private final JdbcTemplate jdbcTemplate;

    public RefreshTokenRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public RefreshToken save(RefreshToken token) {
        if (token.getId() == null) {
            token.setId(UUID.randomUUID());
        }

        String sql = """
            INSERT INTO auth.refresh_tokens (id, user_id, token_hash, expires_at, created_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql,
            token.getId(),
            token.getUserId(),
            token.getTokenHash(),
            Timestamp.valueOf(token.getExpiresAt()),
            Timestamp.valueOf(token.getCreatedAt() != null ? token.getCreatedAt() : LocalDateTime.now()),
            token.getIpAddress(),
            token.getUserAgent()
        );
        return token;
    }

    public Optional<RefreshToken> findByTokenHash(String tokenHash) {
        String sql = "SELECT * FROM auth.refresh_tokens WHERE token_hash = ?";
        List<RefreshToken> tokens = jdbcTemplate.query(sql, rowMapper, tokenHash);
        return tokens.stream().findFirst();
    }

    public void revokeToken(UUID tokenId, UUID replacedById) {
        String sql = "UPDATE auth.refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, replaced_by = ? WHERE id = ?";
        jdbcTemplate.update(sql, replacedById, tokenId);
    }

    public void revokeAllByUserId(UUID userId) {
        String sql = "UPDATE auth.refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL";
        jdbcTemplate.update(sql, userId);
    }

    @jakarta.annotation.PostConstruct
    public void initTable() {
        try {
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS auth;");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    token_hash VARCHAR(255) NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    revoked_at TIMESTAMP,
                    replaced_by UUID,
                    ip_address VARCHAR(100),
                    user_agent VARCHAR(500)
                );
            """);
        } catch (Exception ignored) {}
    }

    public void cleanupExpired() {
        try {
            Timestamp cutoff = Timestamp.valueOf(LocalDateTime.now().minusDays(30));
            String sql = "DELETE FROM auth.refresh_tokens WHERE (revoked_at IS NOT NULL AND revoked_at < ?) OR (expires_at < ?)";
            jdbcTemplate.update(sql, cutoff, cutoff);
        } catch (Exception ignored) {}
    }

    private final RowMapper<RefreshToken> rowMapper = (rs, rowNum) -> {
        RefreshToken token = new RefreshToken();
        token.setId(rs.getObject("id", UUID.class));
        token.setUserId(rs.getObject("user_id", UUID.class));
        token.setTokenHash(rs.getString("token_hash"));
        Timestamp exp = rs.getTimestamp("expires_at");
        if (exp != null) token.setExpiresAt(exp.toLocalDateTime());
        Timestamp crt = rs.getTimestamp("created_at");
        if (crt != null) token.setCreatedAt(crt.toLocalDateTime());
        Timestamp rvk = rs.getTimestamp("revoked_at");
        if (rvk != null) token.setRevokedAt(rvk.toLocalDateTime());
        token.setReplacedBy(rs.getObject("replaced_by", UUID.class));
        token.setIpAddress(rs.getString("ip_address"));
        token.setUserAgent(rs.getString("user_agent"));
        return token;
    };
}
