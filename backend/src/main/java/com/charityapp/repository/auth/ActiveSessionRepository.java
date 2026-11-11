package com.charityapp.repository.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Repository
public class ActiveSessionRepository {

    private final JdbcTemplate jdbcTemplate;

    public ActiveSessionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void save(UUID userId, String tokenHash, String ip, String ua, Instant expiresAt) {
        String sql = """
            INSERT INTO auth.active_sessions (id, user_id, token_hash, ip_address, user_agent, created_at, expires_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
            """;
        jdbcTemplate.update(sql,
            UUID.randomUUID(),
            userId,
            tokenHash,
            ip,
            ua,
            Timestamp.from(expiresAt)
        );
    }

    public boolean validateAndTouch(String tokenHash) {
        if (tokenHash == null || tokenHash.isBlank()) return false;
        String sql = "UPDATE auth.active_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP";
        int rows = jdbcTemplate.update(sql, tokenHash);
        return rows > 0;
    }

    public int countByUserId(UUID userId) {
        if (userId == null) return 0;
        String sql = "SELECT COUNT(*) FROM auth.active_sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    public void deleteOldest(UUID userId) {
        if (userId == null) return;
        String sql = """
            DELETE FROM auth.active_sessions
            WHERE id = (
                SELECT id FROM auth.active_sessions
                WHERE user_id = ?
                ORDER BY created_at ASC
                LIMIT 1
            )
            """;
        jdbcTemplate.update(sql, userId);
    }

    public void deleteExpired(UUID userId) {
        if (userId == null) return;
        String sql = "DELETE FROM auth.active_sessions WHERE user_id = ? AND expires_at <= CURRENT_TIMESTAMP";
        jdbcTemplate.update(sql, userId);
    }

    public void deleteByUserIdAndUserAgent(UUID userId, String ua) {
        if (userId == null || ua == null || ua.isBlank()) return;
        String sql = "DELETE FROM auth.active_sessions WHERE user_id = ? AND user_agent = ?";
        jdbcTemplate.update(sql, userId, ua.trim());
    }

    public void deleteByTokenHash(String tokenHash) {
        if (tokenHash == null || tokenHash.isBlank()) return;
        String sql = "DELETE FROM auth.active_sessions WHERE token_hash = ?";
        jdbcTemplate.update(sql, tokenHash);
    }

    public void deleteAllByUserId(UUID userId) {
        if (userId == null) return;
        String sql = "DELETE FROM auth.active_sessions WHERE user_id = ?";
        jdbcTemplate.update(sql, userId);
    }

    @jakarta.annotation.PostConstruct
    public void initTable() {
        try {
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS auth;");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS auth.active_sessions (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL,
                    token_hash VARCHAR(255) NOT NULL,
                    ip_address VARCHAR(100),
                    user_agent VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """);
        } catch (Exception ignored) {}
    }

    public void deleteAllExpired() {
        try {
            String sql = "DELETE FROM auth.active_sessions WHERE expires_at <= CURRENT_TIMESTAMP";
            jdbcTemplate.update(sql);
        } catch (Exception ignored) {}
    }
}
