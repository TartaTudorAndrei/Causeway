package com.charityapp.repository.finance;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DonationPickupRepository {

    private static final Logger log = LoggerFactory.getLogger(DonationPickupRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public DonationPickupRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean isPickedUp(Long donationId) {
        String sql = "SELECT picked_up FROM donations.donation_pickups WHERE donation_id = ?";
        try {
            Boolean result = jdbcTemplate.queryForObject(sql, Boolean.class, donationId);
            return result != null && result;
        } catch (EmptyResultDataAccessException e) {
            return false;
        } catch (Exception e) {
            log.error("Failed to query pickup status for donationId: {}", donationId, e);
            return false;
        }
    }

    public void setPickupStatus(Long donationId, boolean status) {
        String sql = """
                INSERT INTO donations.donation_pickups (donation_id, picked_up, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (donation_id)
                DO UPDATE SET picked_up = EXCLUDED.picked_up, updated_at = CURRENT_TIMESTAMP
                """;
        jdbcTemplate.update(sql, donationId, status);
    }
}
