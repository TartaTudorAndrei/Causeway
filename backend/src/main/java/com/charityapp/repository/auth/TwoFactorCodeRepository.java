package com.charityapp.repository.auth;

import com.charityapp.model.auth.TwoFactorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TwoFactorCodeRepository {
    private final JdbcTemplate jdbcTemplate;

    public TwoFactorCodeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public TwoFactorCode save(TwoFactorCode code) {
        if (code.getId() == null) {
            code.setId(UUID.randomUUID());
        }
        if (code.getCreatedAt() == null) {
            code.setCreatedAt(LocalDateTime.now());
        }

        String sql = """
            INSERT INTO auth.two_factor_codes 
            (id, admin_user_id, code_hash, code_type, session_token, expires_at, created_at, used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

        jdbcTemplate.update(sql,
            code.getId(),
            code.getAdminUserId(),
            code.getCodeHash(),
            code.getCodeType(),
            code.getSessionToken(),
            Timestamp.valueOf(code.getExpiresAt()),
            Timestamp.valueOf(code.getCreatedAt()),
            code.isUsed()
        );

        return code;
    }

    public Optional<TwoFactorCode> findActiveCode(UUID adminUserId, String codeHash, String codeType) {
        String sql = """
            SELECT * FROM auth.two_factor_codes 
            WHERE admin_user_id = ? AND code_hash = ? AND code_type = ? AND used = FALSE AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC LIMIT 1
            """;
        List<TwoFactorCode> list = jdbcTemplate.query(sql, rowMapper, adminUserId, codeHash, codeType);
        return list.stream().findFirst();
    }

    public Optional<TwoFactorCode> findActiveBySessionToken(String sessionToken) {
        String sql = """
            SELECT * FROM auth.two_factor_codes 
            WHERE session_token = ? AND used = FALSE AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC LIMIT 1
            """;
        List<TwoFactorCode> list = jdbcTemplate.query(sql, rowMapper, sessionToken);
        return list.stream().findFirst();
    }

    public void markUsed(UUID id) {
        String sql = "UPDATE auth.two_factor_codes SET used = TRUE WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public void invalidateUserCodes(UUID adminUserId, String codeType) {
        String sql = "UPDATE auth.two_factor_codes SET used = TRUE WHERE admin_user_id = ? AND code_type = ? AND used = FALSE";
        jdbcTemplate.update(sql, adminUserId, codeType);
    }

    public void invalidateSession(String sessionToken) {
        String sql = "UPDATE auth.two_factor_codes SET used = TRUE WHERE session_token = ? AND used = FALSE";
        jdbcTemplate.update(sql, sessionToken);
    }

    private final RowMapper<TwoFactorCode> rowMapper = (rs, rowNum) -> {
        TwoFactorCode c = new TwoFactorCode();
        c.setId(rs.getObject("id", UUID.class));
        c.setAdminUserId(rs.getObject("admin_user_id", UUID.class));
        c.setCodeHash(rs.getString("code_hash"));
        c.setCodeType(rs.getString("code_type"));
        c.setSessionToken(rs.getString("session_token"));
        Timestamp exp = rs.getTimestamp("expires_at");
        if (exp != null) c.setExpiresAt(exp.toLocalDateTime());
        Timestamp crt = rs.getTimestamp("created_at");
        if (crt != null) c.setCreatedAt(crt.toLocalDateTime());
        c.setUsed(rs.getBoolean("used"));
        return c;
    };
}
