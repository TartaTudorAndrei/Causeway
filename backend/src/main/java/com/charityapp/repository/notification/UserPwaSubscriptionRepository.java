package com.charityapp.repository.notification;

import com.charityapp.model.notification.UserPwaSubscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

@Repository
public class UserPwaSubscriptionRepository {

    private static final Logger log = LoggerFactory.getLogger(UserPwaSubscriptionRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public UserPwaSubscriptionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<UserPwaSubscription> rowMapper = new RowMapper<>() {
        @Override
        public UserPwaSubscription mapRow(ResultSet rs, int rowNum) throws SQLException {
            UserPwaSubscription sub = new UserPwaSubscription();
            sub.setId((UUID) rs.getObject("id"));
            sub.setUserId((UUID) rs.getObject("user_id"));
            sub.setEndpoint(rs.getString("endpoint"));
            sub.setP256dh(rs.getString("p256dh"));
            sub.setAuth(rs.getString("auth"));
            sub.setUserAgent(rs.getString("user_agent"));

            Timestamp ct = rs.getTimestamp("created_at");
            if (ct != null) sub.setCreatedAt(ct.toLocalDateTime());
            Timestamp ut = rs.getTimestamp("updated_at");
            if (ut != null) sub.setUpdatedAt(ut.toLocalDateTime());

            return sub;
        }
    };

    public UserPwaSubscription save(UserPwaSubscription sub) {
        if (sub.getId() == null) {
            sub.setId(UUID.randomUUID());
        }
        if (sub.getCreatedAt() == null) {
            sub.setCreatedAt(LocalDateTime.now());
        }
        sub.setUpdatedAt(LocalDateTime.now());

        String sql = """
            INSERT INTO auth.user_pwa_subscriptions
            (id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (endpoint) DO UPDATE
            SET user_id = EXCLUDED.user_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                user_agent = EXCLUDED.user_agent,
                updated_at = NOW()
            """;

        jdbcTemplate.update(sql,
                sub.getId(),
                sub.getUserId(),
                sub.getEndpoint(),
                sub.getP256dh(),
                sub.getAuth(),
                sub.getUserAgent(),
                Timestamp.valueOf(sub.getCreatedAt()),
                Timestamp.valueOf(sub.getUpdatedAt())
        );
        return sub;
    }

    public List<UserPwaSubscription> findByUserId(UUID userId) {
        String sql = "SELECT * FROM auth.user_pwa_subscriptions WHERE user_id = ?";
        return jdbcTemplate.query(sql, rowMapper, userId);
    }

    public List<UserPwaSubscription> findByUserIds(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) return List.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(userIds.size(), "?"));
        String sql = "SELECT * FROM auth.user_pwa_subscriptions WHERE user_id IN (" + placeholders + ")";
        return jdbcTemplate.query(sql, rowMapper, userIds.toArray());
    }

    public List<UserPwaSubscription> findAll() {
        String sql = "SELECT * FROM auth.user_pwa_subscriptions";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public int deleteByEndpoint(String endpoint) {
        if (endpoint == null) return 0;
        String sql = "DELETE FROM auth.user_pwa_subscriptions WHERE endpoint = ?";
        return jdbcTemplate.update(sql, endpoint);
    }

    public int countActiveSubscriptions() {
        String sql = "SELECT COUNT(*) FROM auth.user_pwa_subscriptions";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }
}
