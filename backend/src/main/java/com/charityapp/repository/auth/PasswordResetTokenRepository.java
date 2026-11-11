package com.charityapp.repository.auth;

import com.charityapp.model.auth.PasswordResetToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Repository
public class PasswordResetTokenRepository {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetTokenRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public PasswordResetTokenRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PasswordResetToken save(PasswordResetToken token) {
        if (token.getId() == null) {
            token.setId(UUID.randomUUID());
        }
        if (token.getCreatedAt() == null) {
            token.setCreatedAt(LocalDateTime.now());
        }
        if (token.getExpiryDate() == null) {
            token.setExpiryDate(LocalDateTime.now().plusHours(2));
        }

        String sql = """
            INSERT INTO auth.password_reset_tokens 
            (id, token_hash, admin_user_id, expiry_date, created_at)
            VALUES (?, ?, ?, ?, ?)
            """;

        try {
            int rows = jdbcTemplate.update(sql,
                token.getId(),
                token.getTokenHash(),
                token.getAdminUserId(),
                Timestamp.valueOf(token.getExpiryDate()),
                Timestamp.valueOf(token.getCreatedAt())
            );
            log.info("Successfully inserted password reset token for user {} (rows={})", token.getAdminUserId(), rows);
        } catch (Exception e) {
            log.error("Failed to insert password reset token for user {}: {}", token.getAdminUserId(), e.getMessage(), e);
            throw e;
        }

        return token;
    }

    public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
        if (tokenHash == null || tokenHash.isBlank()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM auth.password_reset_tokens WHERE LOWER(token_hash) = LOWER(?)";
        List<PasswordResetToken> tokens = jdbcTemplate.query(sql, rowMapper, tokenHash.trim());
        return tokens.stream().findFirst();
    }

    public void deleteByUserId(UUID userId) {
        String sql = "DELETE FROM auth.password_reset_tokens WHERE admin_user_id = ?";
        jdbcTemplate.update(sql, userId);
    }

    public void deleteByTokenHash(String tokenHash) {
        String sql = "DELETE FROM auth.password_reset_tokens WHERE LOWER(token_hash) = LOWER(?)";
        jdbcTemplate.update(sql, tokenHash.trim());
    }

    private final RowMapper<PasswordResetToken> rowMapper = (rs, rowNum) -> {
        PasswordResetToken token = new PasswordResetToken();
        token.setId(rs.getObject("id", UUID.class));
        token.setTokenHash(rs.getString("token_hash"));
        token.setAdminUserId(rs.getObject("admin_user_id", UUID.class));
        token.setExpiryDate(rs.getTimestamp("expiry_date").toLocalDateTime());
        token.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return token;
    };
}
