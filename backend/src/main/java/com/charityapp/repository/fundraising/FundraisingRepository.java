package com.charityapp.repository.fundraising;

import com.charityapp.model.fundraising.FundraisingSponsor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class FundraisingRepository {

    private final JdbcTemplate jdbcTemplate;

    public FundraisingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<FundraisingSponsor> sponsorRowMapper = (rs, rowNum) -> {
        FundraisingSponsor s = new FundraisingSponsor();
        s.setId(UUID.fromString(rs.getString("id")));
        s.setSortIndex(rs.getInt("sort_index"));
        s.setCompanyName(rs.getString("company_name"));
        s.setCompanyProfile(rs.getString("company_profile"));
        s.setContactInfo(rs.getString("contact_info"));
        s.setResponsiblePerson(rs.getString("responsible_person"));
        s.setStatus(rs.getString("status"));
        
        Date lcd = rs.getDate("last_contact_date");
        if (lcd != null) {
            s.setLastContactDate(lcd.toLocalDate());
        }
        
        s.setContractUrl(rs.getString("contract_url"));
        s.setNotes(rs.getString("notes"));
        s.setSponsorshipType(rs.getString("sponsorship_type"));
        s.setReceivedType(rs.getString("received_type"));
        s.setReceivedValue(rs.getString("received_value"));
        s.setCurrency(rs.getString("currency"));

        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) s.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) s.setUpdatedAt(uat.toLocalDateTime());

        return s;
    };

    public List<FundraisingSponsor> findAll() {
        String sql = "SELECT * FROM fundraising.sponsors ORDER BY sort_index ASC, created_at DESC";
        return jdbcTemplate.query(sql, sponsorRowMapper);
    }

    public Optional<FundraisingSponsor> findById(UUID id) {
        String sql = "SELECT * FROM fundraising.sponsors WHERE id = ?";
        List<FundraisingSponsor> results = jdbcTemplate.query(sql, sponsorRowMapper, id);
        return results.stream().findFirst();
    }

    public FundraisingSponsor save(FundraisingSponsor sponsor) {
        if (sponsor.getId() == null) {
            sponsor.setId(UUID.randomUUID());
        }
        String sql = "INSERT INTO fundraising.sponsors (id, sort_index, company_name, company_profile, contact_info, responsible_person, status, last_contact_date, contract_url, notes, sponsorship_type, received_type, received_value, currency, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        jdbcTemplate.update(sql,
                sponsor.getId(),
                sponsor.getSortIndex(),
                sponsor.getCompanyName(),
                sponsor.getCompanyProfile(),
                sponsor.getContactInfo(),
                sponsor.getResponsiblePerson(),
                sponsor.getStatus(),
                sponsor.getLastContactDate() != null ? Date.valueOf(sponsor.getLastContactDate()) : null,
                sponsor.getContractUrl(),
                sponsor.getNotes(),
                sponsor.getSponsorshipType(),
                sponsor.getReceivedType(),
                sponsor.getReceivedValue(),
                sponsor.getCurrency()
        );
        
        syncToFinanceSponsorship(sponsor);
        return sponsor;
    }

    public void update(FundraisingSponsor sponsor) {
        String sql = "UPDATE fundraising.sponsors SET sort_index = ?, company_name = ?, company_profile = ?, contact_info = ?, responsible_person = ?, status = ?, last_contact_date = ?, contract_url = ?, notes = ?, sponsorship_type = ?, received_type = ?, received_value = ?, currency = ?, updated_at = NOW() WHERE id = ?";
        jdbcTemplate.update(sql,
                sponsor.getSortIndex(),
                sponsor.getCompanyName(),
                sponsor.getCompanyProfile(),
                sponsor.getContactInfo(),
                sponsor.getResponsiblePerson(),
                sponsor.getStatus(),
                sponsor.getLastContactDate() != null ? Date.valueOf(sponsor.getLastContactDate()) : null,
                sponsor.getContractUrl(),
                sponsor.getNotes(),
                sponsor.getSponsorshipType(),
                sponsor.getReceivedType(),
                sponsor.getReceivedValue(),
                sponsor.getCurrency(),
                sponsor.getId()
        );
        
        syncToFinanceSponsorship(sponsor);
    }

    public void delete(UUID id) {
        String sql = "DELETE FROM fundraising.sponsors WHERE id = ?";
        jdbcTemplate.update(sql, id);
        
        deleteFromFinanceSponsorship(id);
    }

    private void syncToFinanceSponsorship(FundraisingSponsor sponsor) {
        boolean isFinished = "CONTRACT_SIGNED".equalsIgnoreCase(sponsor.getStatus()) || "SPONSORED".equalsIgnoreCase(sponsor.getStatus());
        boolean isMoney = "MONEY".equalsIgnoreCase(sponsor.getReceivedType());
        if (isFinished && isMoney) {
    // Upsert into finance.finance_sponsorships
            BigDecimal amount = BigDecimal.ZERO;
            if (sponsor.getReceivedValue() != null) {
                try {
                    String cleanVal = sponsor.getReceivedValue().replaceAll("[^0-9.]", "");
                    if (!cleanVal.isEmpty()) {
                        amount = new BigDecimal(cleanVal);
                    }
                } catch (Exception ignored) {}
            }

            String paymentStatus = "Contract Signed";
            if ("SPONSORED".equalsIgnoreCase(sponsor.getStatus())) {
                paymentStatus = "Funds Received";
            }

            // check if exists
            String checkSql = "SELECT COUNT(*) FROM finance.finance_sponsorships WHERE id = ?";
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, sponsor.getId());

            if (count != null && count > 0) {
                String updateSql = "UPDATE finance.finance_sponsorships SET sponsor_name = ?, contact_person = ?, contact_email = ?, tier = ?, agreed_amount = ?, currency = ?, payment_status = ?, contract_url = ?, received_date = ?, updated_at = NOW() WHERE id = ?";
                jdbcTemplate.update(updateSql,
                        sponsor.getCompanyName(),
                        sponsor.getResponsiblePerson(),
                        sponsor.getContactInfo(),
                        sponsor.getSponsorshipType() != null ? sponsor.getSponsorshipType() : "Gold",
                        amount,
                        sponsor.getCurrency() != null ? sponsor.getCurrency() : "RON",
                        paymentStatus,
                        sponsor.getContractUrl(),
                        sponsor.getLastContactDate() != null ? Date.valueOf(sponsor.getLastContactDate()) : null,
                        sponsor.getId()
                );
            } else {
                String insertSql = "INSERT INTO finance.finance_sponsorships (id, sponsor_name, contact_person, contact_email, tier, agreed_amount, currency, payment_status, campaign, contract_url, received_date, created_at, updated_at) " +
                                   "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'General', ?, ?, NOW(), NOW())";
                jdbcTemplate.update(insertSql,
                        sponsor.getId(),
                        sponsor.getCompanyName(),
                        sponsor.getResponsiblePerson(),
                        sponsor.getContactInfo(),
                        sponsor.getSponsorshipType() != null ? sponsor.getSponsorshipType() : "Gold",
                        amount,
                        sponsor.getCurrency() != null ? sponsor.getCurrency() : "RON",
                        paymentStatus,
                        sponsor.getContractUrl(),
                        sponsor.getLastContactDate() != null ? Date.valueOf(sponsor.getLastContactDate()) : null
                );
            }
        } else {
            // Remove from finance.finance_sponsorships if status changed or not money
            deleteFromFinanceSponsorship(sponsor.getId());
        }
    }

    private void deleteFromFinanceSponsorship(UUID id) {
        String sql = "DELETE FROM finance.finance_sponsorships WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }
}
