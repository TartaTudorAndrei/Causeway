package com.charityapp.repository.auth;

import com.charityapp.model.auth.EmailVerificationToken;
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
public class EmailVerificationTokenRepository {
    private static final Logger log = LoggerFactory.getLogger(EmailVerificationTokenRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public EmailVerificationTokenRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public EmailVerificationToken save(EmailVerificationToken token) {
        if (token.getId() == null) {
            token.setId(UUID.randomUUID());
        }
        if (token.getCreatedAt() == null) {
            token.setCreatedAt(LocalDateTime.now());
        }
        if (token.getExpiryDate() == null) {
            token.setExpiryDate(LocalDateTime.now().plusHours(24));
        }

        String sql = """
            INSERT INTO auth.email_verification_tokens 
            (id, token_hash, admin_user_id, expiry_date, created_at, pending_shift_id, pending_role_id, pending_stand_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

        try {
            int rows = jdbcTemplate.update(sql,
                token.getId(),
                token.getTokenHash(),
                token.getAdminUserId(),
                Timestamp.valueOf(token.getExpiryDate()),
                Timestamp.valueOf(token.getCreatedAt()),
                token.getPendingShiftId(),
                token.getPendingRoleId(),
                token.getPendingStandId()
            );
            log.info("Successfully inserted email verification token for user {} (rows={})", token.getAdminUserId(), rows);
        } catch (Exception e) {
            log.error("Failed to insert email verification token for user {}: {}", token.getAdminUserId(), e.getMessage(), e);
            throw e;
        }

        return token;
    }

    public Optional<EmailVerificationToken> findByTokenHash(String tokenHash) {
        if (tokenHash == null || tokenHash.isBlank()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM auth.email_verification_tokens WHERE LOWER(token_hash) = LOWER(?)";
        List<EmailVerificationToken> tokens = jdbcTemplate.query(sql, rowMapper, tokenHash.trim());
        return tokens.stream().findFirst();
    }

    public void deleteByUserId(UUID userId) {
        String sql = "DELETE FROM auth.email_verification_tokens WHERE admin_user_id = ?";
        jdbcTemplate.update(sql, userId);
    }

    private final RowMapper<EmailVerificationToken> rowMapper = (rs, rowNum) -> {
        EmailVerificationToken token = new EmailVerificationToken();
        token.setId(rs.getObject("id", UUID.class));
        token.setTokenHash(rs.getString("token_hash"));
        token.setAdminUserId(rs.getObject("admin_user_id", UUID.class));
        token.setExpiryDate(rs.getTimestamp("expiry_date").toLocalDateTime());
        token.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        try {
            token.setPendingShiftId(rs.getObject("pending_shift_id", UUID.class));
            token.setPendingRoleId(rs.getObject("pending_role_id", UUID.class));
            token.setPendingStandId(rs.getObject("pending_stand_id", UUID.class));
        } catch (Exception ignored) {}
        return token;
    };
}
