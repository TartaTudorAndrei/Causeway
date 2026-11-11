package com.charityapp.repository.finance;

import com.charityapp.model.finance.Donation;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class DonationRepository {

    private final JdbcTemplate jdbcTemplate;

    public DonationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long getNextPickupCodeSequenceValue() {
        String sql = "SELECT nextval('donations.pickup_code_seq')";
        return jdbcTemplate.queryForObject(sql, Long.class);
    }

    public Optional<Donation> saveIfAbsent(Donation donation) {
        String sql = """
            INSERT INTO donations.donations 
            (payment_transaction_id, payment_provider, donor_email, amount, currency, pickup_code, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (payment_transaction_id) DO NOTHING
            RETURNING id
            """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        int rows = jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, donation.getPaymentTransactionId());
            ps.setString(2, donation.getPaymentProvider());
            ps.setString(3, donation.getDonorEmail());
            ps.setBigDecimal(4, donation.getAmount());
            ps.setString(5, donation.getCurrency());
            ps.setString(6, donation.getPickupCode());
            ps.setString(7, donation.getStatus());
            ps.setTimestamp(8, Timestamp.valueOf(donation.getCreatedAt()));
            return ps;
        }, keyHolder);

        if (rows > 0 && keyHolder.getKey() != null) {
            donation.setId(keyHolder.getKey().longValue());
            return Optional.of(donation);
        }
        return Optional.empty();
    }

    public Donation save(Donation donation) {
        String sql = """
            INSERT INTO donations.donations 
            (payment_transaction_id, payment_provider, donor_email, amount, currency, pickup_code, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, donation.getPaymentTransactionId());
            ps.setString(2, donation.getPaymentProvider());
            ps.setString(3, donation.getDonorEmail());
            ps.setBigDecimal(4, donation.getAmount());
            ps.setString(5, donation.getCurrency());
            ps.setString(6, donation.getPickupCode());
            ps.setString(7, donation.getStatus());
            ps.setTimestamp(8, Timestamp.valueOf(donation.getCreatedAt()));
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() != null) {
            donation.setId(keyHolder.getKey().longValue());
        }
        return donation;
    }

    public Optional<Donation> findByPaymentTransactionId(String paymentTransactionId) {
        String sql = "SELECT * FROM donations.donations WHERE payment_transaction_id = ?";
        List<Donation> donations = jdbcTemplate.query(sql, donationRowMapper, paymentTransactionId);
        return donations.stream().findFirst();
    }

    public Optional<Donation> findByPickupCode(String pickupCode) {
        String sql = "SELECT * FROM donations.donations WHERE pickup_code = ?";
        List<Donation> donations = jdbcTemplate.query(sql, donationRowMapper, pickupCode);
        return donations.stream().findFirst();
    }

    public void updateStatus(String paymentTransactionId, String status) {
        String sql = "UPDATE donations.donations SET status = ? WHERE payment_transaction_id = ?";
        jdbcTemplate.update(sql, status, paymentTransactionId);
    }

    public List<Donation> findAll() {
        String sql = "SELECT * FROM donations.donations ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, donationRowMapper);
    }

    public List<com.charityapp.dto.finance.DonationResponse> findAllWithPickupStatus() {
        String sql = """
            SELECT d.id, d.payment_transaction_id, d.payment_provider, d.donor_email, d.amount,
                   d.currency, d.pickup_code, d.status, d.created_at,
                   COALESCE(p.picked_up, false) AS is_picked_up
            FROM donations.donations d
            LEFT JOIN donations.donation_pickups p ON d.id = p.donation_id
            ORDER BY d.created_at DESC
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Donation donation = new Donation();
            donation.setId(rs.getLong("id"));
            donation.setPaymentTransactionId(rs.getString("payment_transaction_id"));
            donation.setPaymentProvider(rs.getString("payment_provider"));
            donation.setDonorEmail(rs.getString("donor_email"));
            donation.setAmount(rs.getBigDecimal("amount"));
            donation.setCurrency(rs.getString("currency"));
            donation.setPickupCode(rs.getString("pickup_code"));
            donation.setStatus(rs.getString("status"));
            donation.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            boolean pickedUp = rs.getBoolean("is_picked_up");
            return new com.charityapp.dto.finance.DonationResponse(donation, pickedUp);
        });
    }

    public List<com.charityapp.dto.finance.DonationResponse> findByDonorEmailWithPickupStatus(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        String sql = """
            SELECT d.id, d.payment_transaction_id, d.payment_provider, d.donor_email, d.amount,
                   d.currency, d.pickup_code, d.status, d.created_at,
                   COALESCE(p.picked_up, false) AS is_picked_up
            FROM donations.donations d
            LEFT JOIN donations.donation_pickups p ON d.id = p.donation_id
            WHERE LOWER(d.donor_email) = LOWER(?)
            ORDER BY d.created_at DESC
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Donation donation = new Donation();
            donation.setId(rs.getLong("id"));
            donation.setPaymentTransactionId(rs.getString("payment_transaction_id"));
            donation.setPaymentProvider(rs.getString("payment_provider"));
            donation.setDonorEmail(rs.getString("donor_email"));
            donation.setAmount(rs.getBigDecimal("amount"));
            donation.setCurrency(rs.getString("currency"));
            donation.setPickupCode(rs.getString("pickup_code"));
            donation.setStatus(rs.getString("status"));
            donation.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            boolean pickedUp = rs.getBoolean("is_picked_up");
            return new com.charityapp.dto.finance.DonationResponse(donation, pickedUp);
        }, email.trim());
    }

    private final RowMapper<Donation> donationRowMapper = (rs, rowNum) -> {
        Donation donation = new Donation();
        donation.setId(rs.getLong("id"));
        donation.setPaymentTransactionId(rs.getString("payment_transaction_id"));
        donation.setPaymentProvider(rs.getString("payment_provider"));
        donation.setDonorEmail(rs.getString("donor_email"));
        donation.setAmount(rs.getBigDecimal("amount"));
        donation.setCurrency(rs.getString("currency"));
        donation.setPickupCode(rs.getString("pickup_code"));
        donation.setStatus(rs.getString("status"));
        donation.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return donation;
    };
}