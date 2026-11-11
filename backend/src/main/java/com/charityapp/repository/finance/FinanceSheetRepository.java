package com.charityapp.repository.finance;

import com.charityapp.model.finance.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class FinanceSheetRepository {
    private final JdbcTemplate jdbcTemplate;

    public FinanceSheetRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // --- EXPENSES ---
    public List<FinanceExpense> findAllExpenses() {
        String sql = "SELECT * FROM finance.finance_expenses ORDER BY transaction_date DESC, created_at DESC";
        return jdbcTemplate.query(sql, expenseRowMapper);
    }

    public List<String> findDistinctExpenseCategories() {
        String sql = "SELECT DISTINCT category FROM finance.finance_expenses WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC";
        return jdbcTemplate.queryForList(sql, String.class);
    }

    public FinanceExpense saveExpense(FinanceExpense expense) {
        if (expense.getId() == null) {
            expense.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO finance.finance_expenses 
            (id, name, transaction_date, amount, currency, category, description, payment_method, campaign_department, receipt_attachment, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql,
            expense.getId(),
            expense.getName() != null && !expense.getName().isBlank() ? expense.getName().trim() : (expense.getDescription() != null ? expense.getDescription().trim() : "Cheltuială"),
            expense.getTransactionDate() != null ? Date.valueOf(expense.getTransactionDate()) : Date.valueOf(LocalDate.now()),
            expense.getAmount() != null ? expense.getAmount() : BigDecimal.ZERO,
            expense.getCurrency() != null ? expense.getCurrency() : "RON",
            expense.getCategory() != null ? expense.getCategory() : "General",
            expense.getDescription(),
            expense.getPaymentMethod() != null ? expense.getPaymentMethod() : "Bank Transfer",
            expense.getCampaignDepartment() != null && !expense.getCampaignDepartment().isBlank() ? expense.getCampaignDepartment() : "General",
            expense.getReceiptAttachment(),
            expense.getCreatedBy(),
            expense.getCreatedAt() != null ? Timestamp.valueOf(expense.getCreatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now()),
            expense.getUpdatedAt() != null ? Timestamp.valueOf(expense.getUpdatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now())
        );
        return expense;
    }

    public void updateExpense(FinanceExpense expense) {
        String sql = """
            UPDATE finance.finance_expenses
            SET name = ?, transaction_date = ?, amount = ?, currency = ?, category = ?, description = ?, payment_method = ?, campaign_department = ?, receipt_attachment = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbcTemplate.update(sql,
            expense.getName() != null && !expense.getName().isBlank() ? expense.getName().trim() : (expense.getDescription() != null ? expense.getDescription().trim() : "Cheltuială"),
            expense.getTransactionDate() != null ? Date.valueOf(expense.getTransactionDate()) : Date.valueOf(LocalDate.now()),
            expense.getAmount() != null ? expense.getAmount() : BigDecimal.ZERO,
            expense.getCurrency() != null ? expense.getCurrency() : "RON",
            expense.getCategory() != null ? expense.getCategory() : "General",
            expense.getDescription(),
            expense.getPaymentMethod() != null ? expense.getPaymentMethod() : "Bank Transfer",
            expense.getCampaignDepartment() != null && !expense.getCampaignDepartment().isBlank() ? expense.getCampaignDepartment() : "General",
            expense.getReceiptAttachment(),
            expense.getId()
        );
    }

    public Optional<FinanceExpense> findExpenseById(UUID id) {
        String sql = "SELECT * FROM finance.finance_expenses WHERE id = ?";
        List<FinanceExpense> list = jdbcTemplate.query(sql, expenseRowMapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public void deleteExpense(UUID id) {
        String sql = "DELETE FROM finance.finance_expenses WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // --- ONLINE DONATIONS ---
    public List<FinanceOnlineDonation> findAllOnlineDonations() {
        String sql = "SELECT * FROM finance.finance_online_donations ORDER BY transaction_date DESC";
        return jdbcTemplate.query(sql, onlineDonationRowMapper);
    }

    public FinanceOnlineDonation saveOnlineDonation(FinanceOnlineDonation donation) {
        if (donation.getId() == null) {
            donation.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO finance.finance_online_donations
            (id, processor, transaction_id, donor_name, donor_email, amount, currency, processing_fee, campaign, transaction_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (transaction_id) DO UPDATE SET status = EXCLUDED.status
            """;
        jdbcTemplate.update(sql,
            donation.getId(),
            donation.getProcessor(),
            donation.getTransactionId(),
            donation.getDonorName(),
            donation.getDonorEmail(),
            donation.getAmount(),
            donation.getCurrency(),
            donation.getProcessingFee(),
            donation.getCampaign(),
            Timestamp.valueOf(donation.getTransactionDate()),
            donation.getStatus(),
            Timestamp.valueOf(donation.getCreatedAt())
        );
        return donation;
    }

    // --- STANDS (END OF DAY FORMS) ---
    public List<FinanceStand> findAllStands() {
        String sql = "SELECT * FROM finance.finance_stands ORDER BY event_date DESC, created_at DESC";
        return jdbcTemplate.query(sql, standRowMapper);
    }

    public FinanceStand saveStand(FinanceStand stand) {
        if (stand.getId() == null) {
            stand.setId(UUID.randomUUID());
        }
        if (stand.getCreatedAt() == null) {
            stand.setCreatedAt(LocalDateTime.now());
        }
        if (stand.getUpdatedAt() == null) {
            stand.setUpdatedAt(LocalDateTime.now());
        }
        if (stand.getCashCollected() == null) {
            stand.setCashCollected(BigDecimal.ZERO);
        }
        if (stand.getPosCardCollected() == null) {
            stand.setPosCardCollected(BigDecimal.ZERO);
        }
        if (stand.getOpeningBalance() == null) {
            stand.setOpeningBalance(BigDecimal.ZERO);
        }
        if (stand.getClosingBalance() == null) {
            stand.setClosingBalance(BigDecimal.ZERO);
        }
        if (stand.getDiscrepancyAmount() == null) {
            stand.setDiscrepancyAmount(BigDecimal.ZERO);
        }
        if (stand.getStatus() == null) {
            stand.setStatus("SUBMITTED");
        }
        String sql = """
            INSERT INTO finance.finance_stands
            (id, stand_location, event_date, shift_name, finance_responsible_id, finance_responsible_name, cash_collected, pos_card_collected, opening_balance, closing_balance, discrepancy_amount, discrepancy_notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql,
            stand.getId(),
            stand.getStandLocation() != null ? stand.getStandLocation() : "Stand",
            stand.getEventDate() != null ? Date.valueOf(stand.getEventDate()) : Date.valueOf(LocalDate.now()),
            stand.getShiftName() != null && !stand.getShiftName().isBlank() ? stand.getShiftName() : "All Day (EoD)",
            stand.getFinanceResponsibleId(),
            stand.getFinanceResponsibleName() != null ? stand.getFinanceResponsibleName() : "Responsabil",
            stand.getCashCollected(),
            stand.getPosCardCollected(),
            stand.getOpeningBalance(),
            stand.getClosingBalance(),
            stand.getDiscrepancyAmount(),
            stand.getDiscrepancyNotes(),
            stand.getStatus(),
            Timestamp.valueOf(stand.getCreatedAt()),
            Timestamp.valueOf(stand.getUpdatedAt())
        );
        return stand;
    }

    public void updateStand(FinanceStand stand) {
        String sql = """
            UPDATE finance.finance_stands
            SET stand_location = ?, event_date = ?, shift_name = ?, finance_responsible_name = ?, cash_collected = ?, pos_card_collected = ?, opening_balance = ?, closing_balance = ?, discrepancy_amount = ?, discrepancy_notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbcTemplate.update(sql,
            stand.getStandLocation() != null ? stand.getStandLocation() : "Stand",
            stand.getEventDate() != null ? Date.valueOf(stand.getEventDate()) : Date.valueOf(LocalDate.now()),
            stand.getShiftName() != null && !stand.getShiftName().isBlank() ? stand.getShiftName() : "All Day (EoD)",
            stand.getFinanceResponsibleName() != null ? stand.getFinanceResponsibleName() : "Responsabil",
            stand.getCashCollected() != null ? stand.getCashCollected() : BigDecimal.ZERO,
            stand.getPosCardCollected() != null ? stand.getPosCardCollected() : BigDecimal.ZERO,
            stand.getOpeningBalance() != null ? stand.getOpeningBalance() : BigDecimal.ZERO,
            stand.getClosingBalance() != null ? stand.getClosingBalance() : BigDecimal.ZERO,
            stand.getDiscrepancyAmount() != null ? stand.getDiscrepancyAmount() : BigDecimal.ZERO,
            stand.getDiscrepancyNotes(),
            stand.getStatus() != null ? stand.getStatus() : "SUBMITTED",
            stand.getId()
        );
    }

    public void deleteStand(UUID id) {
        String sql = "DELETE FROM finance.finance_stands WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // --- SPONSORSHIPS ---
    public List<FinanceSponsorship> findAllSponsorships() {
        String sql = "SELECT * FROM finance.finance_sponsorships ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, sponsorshipRowMapper);
    }

    public FinanceSponsorship saveSponsorship(FinanceSponsorship sponsorship) {
        if (sponsorship.getId() == null) {
            sponsorship.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO finance.finance_sponsorships
            (id, sponsor_name, contact_person, contact_email, tier, agreed_amount, currency, payment_status, campaign, contract_url, received_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql,
            sponsorship.getId(),
            sponsorship.getSponsorName(),
            sponsorship.getContactPerson(),
            sponsorship.getContactEmail(),
            sponsorship.getTier(),
            sponsorship.getAgreedAmount(),
            sponsorship.getCurrency(),
            sponsorship.getPaymentStatus(),
            sponsorship.getCampaign() != null ? sponsorship.getCampaign() : "General",
            sponsorship.getContractUrl(),
            sponsorship.getReceivedDate() != null ? Date.valueOf(sponsorship.getReceivedDate()) : null,
            sponsorship.getCreatedAt() != null ? Timestamp.valueOf(sponsorship.getCreatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now()),
            sponsorship.getUpdatedAt() != null ? Timestamp.valueOf(sponsorship.getUpdatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now())
        );
        return sponsorship;
    }

    public void updateSponsorship(FinanceSponsorship sponsorship) {
        String sql = """
            UPDATE finance.finance_sponsorships
            SET sponsor_name = ?, contact_person = ?, contact_email = ?, tier = ?, agreed_amount = ?, currency = ?, payment_status = ?, campaign = ?, contract_url = ?, received_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbcTemplate.update(sql,
            sponsorship.getSponsorName(),
            sponsorship.getContactPerson(),
            sponsorship.getContactEmail(),
            sponsorship.getTier(),
            sponsorship.getAgreedAmount(),
            sponsorship.getCurrency(),
            sponsorship.getPaymentStatus(),
            sponsorship.getCampaign(),
            sponsorship.getContractUrl(),
            sponsorship.getReceivedDate() != null ? Date.valueOf(sponsorship.getReceivedDate()) : null,
            sponsorship.getId()
        );
    }

    public void deleteSponsorship(UUID id) {
        String sql = "DELETE FROM finance.finance_sponsorships WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // --- OTHER INCOMES ---
    public List<FinanceOtherIncome> findAllOtherIncomes() {
        String sql = "SELECT * FROM finance.finance_other_incomes ORDER BY transaction_date DESC, created_at DESC";
        return jdbcTemplate.query(sql, otherIncomeRowMapper);
    }

    public FinanceOtherIncome saveOtherIncome(FinanceOtherIncome income) {
        if (income.getId() == null) {
            income.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO finance.finance_other_incomes
            (id, transaction_date, amount, currency, source_payer, category, description, campaign, reference_doc, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql,
            income.getId(),
            Date.valueOf(income.getTransactionDate()),
            income.getAmount(),
            income.getCurrency(),
            income.getSourcePayer(),
            income.getCategory(),
            income.getDescription(),
            income.getCampaign(),
            income.getReferenceDoc(),
            income.getCreatedBy(),
            income.getCreatedAt() != null ? Timestamp.valueOf(income.getCreatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now()),
            income.getUpdatedAt() != null ? Timestamp.valueOf(income.getUpdatedAt()) : Timestamp.valueOf(java.time.LocalDateTime.now())
        );
        return income;
    }

    public void updateOtherIncome(FinanceOtherIncome income) {
        String sql = """
            UPDATE finance.finance_other_incomes
            SET transaction_date = ?, amount = ?, currency = ?, source_payer = ?, category = ?, description = ?, campaign = ?, reference_doc = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbcTemplate.update(sql,
            Date.valueOf(income.getTransactionDate()),
            income.getAmount(),
            income.getCurrency(),
            income.getSourcePayer(),
            income.getCategory(),
            income.getDescription(),
            income.getCampaign(),
            income.getReferenceDoc(),
            income.getId()
        );
    }

    public void deleteOtherIncome(UUID id) {
        String sql = "DELETE FROM finance.finance_other_incomes WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // --- ROW MAPPERS ---
    private final RowMapper<FinanceExpense> expenseRowMapper = (rs, rowNum) -> {
        FinanceExpense e = new FinanceExpense();
        e.setId(rs.getObject("id", UUID.class));
        e.setName(rs.getString("name"));
        e.setTransactionDate(rs.getDate("transaction_date").toLocalDate());
        e.setAmount(rs.getBigDecimal("amount"));
        e.setCurrency(rs.getString("currency"));
        e.setCategory(rs.getString("category"));
        e.setDescription(rs.getString("description"));
        e.setPaymentMethod(rs.getString("payment_method"));
        e.setCampaignDepartment(rs.getString("campaign_department"));
        e.setReceiptAttachment(rs.getString("receipt_attachment"));
        e.setCreatedBy(rs.getObject("created_by", UUID.class));
        e.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        e.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return e;
    };

    private final RowMapper<FinanceOnlineDonation> onlineDonationRowMapper = (rs, rowNum) -> {
        FinanceOnlineDonation d = new FinanceOnlineDonation();
        d.setId(rs.getObject("id", UUID.class));
        d.setProcessor(rs.getString("processor"));
        d.setTransactionId(rs.getString("transaction_id"));
        d.setDonorName(rs.getString("donor_name"));
        d.setDonorEmail(rs.getString("donor_email"));
        d.setAmount(rs.getBigDecimal("amount"));
        d.setCurrency(rs.getString("currency"));
        d.setProcessingFee(rs.getBigDecimal("processing_fee"));
        d.setCampaign(rs.getString("campaign"));
        d.setTransactionDate(rs.getTimestamp("transaction_date").toLocalDateTime());
        d.setStatus(rs.getString("status"));
        d.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return d;
    };

    private final RowMapper<FinanceStand> standRowMapper = (rs, rowNum) -> {
        FinanceStand s = new FinanceStand();
        s.setId(rs.getObject("id", UUID.class));
        s.setStandLocation(rs.getString("stand_location") != null ? rs.getString("stand_location") : "Stand");
        Date evDate = rs.getDate("event_date");
        s.setEventDate(evDate != null ? evDate.toLocalDate() : LocalDate.now());
        s.setShiftName(rs.getString("shift_name") != null ? rs.getString("shift_name") : "All Day (EoD)");
        s.setFinanceResponsibleId(rs.getObject("finance_responsible_id", UUID.class));
        s.setFinanceResponsibleName(rs.getString("finance_responsible_name") != null ? rs.getString("finance_responsible_name") : "Responsabil");
        BigDecimal cash = rs.getBigDecimal("cash_collected");
        s.setCashCollected(cash != null ? cash : BigDecimal.ZERO);
        BigDecimal pos = rs.getBigDecimal("pos_card_collected");
        s.setPosCardCollected(pos != null ? pos : BigDecimal.ZERO);
        BigDecimal opening = rs.getBigDecimal("opening_balance");
        s.setOpeningBalance(opening != null ? opening : BigDecimal.ZERO);
        BigDecimal closing = rs.getBigDecimal("closing_balance");
        s.setClosingBalance(closing != null ? closing : BigDecimal.ZERO);
        BigDecimal disc = rs.getBigDecimal("discrepancy_amount");
        s.setDiscrepancyAmount(disc != null ? disc : BigDecimal.ZERO);
        s.setDiscrepancyNotes(rs.getString("discrepancy_notes") != null ? rs.getString("discrepancy_notes") : "");
        s.setStatus(rs.getString("status") != null ? rs.getString("status") : "SUBMITTED");
        Timestamp created = rs.getTimestamp("created_at");
        s.setCreatedAt(created != null ? created.toLocalDateTime() : LocalDateTime.now());
        Timestamp updated = rs.getTimestamp("updated_at");
        s.setUpdatedAt(updated != null ? updated.toLocalDateTime() : LocalDateTime.now());
        return s;
    };

    private final RowMapper<FinanceSponsorship> sponsorshipRowMapper = (rs, rowNum) -> {
        FinanceSponsorship sp = new FinanceSponsorship();
        sp.setId(rs.getObject("id", UUID.class));
        sp.setSponsorName(rs.getString("sponsor_name"));
        sp.setContactPerson(rs.getString("contact_person"));
        sp.setContactEmail(rs.getString("contact_email"));
        sp.setTier(rs.getString("tier"));
        sp.setAgreedAmount(rs.getBigDecimal("agreed_amount"));
        sp.setCurrency(rs.getString("currency"));
        sp.setPaymentStatus(rs.getString("payment_status"));
        sp.setCampaign(rs.getString("campaign"));
        sp.setContractUrl(rs.getString("contract_url"));
        Date recDate = rs.getDate("received_date");
        sp.setReceivedDate(recDate != null ? recDate.toLocalDate() : null);
        sp.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        sp.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return sp;
    };

    private final RowMapper<FinanceOtherIncome> otherIncomeRowMapper = (rs, rowNum) -> {
        FinanceOtherIncome oi = new FinanceOtherIncome();
        oi.setId(rs.getObject("id", UUID.class));
        oi.setTransactionDate(rs.getDate("transaction_date").toLocalDate());
        oi.setAmount(rs.getBigDecimal("amount"));
        oi.setCurrency(rs.getString("currency"));
        oi.setSourcePayer(rs.getString("source_payer"));
        oi.setCategory(rs.getString("category"));
        oi.setDescription(rs.getString("description"));
        oi.setCampaign(rs.getString("campaign"));
        oi.setReferenceDoc(rs.getString("reference_doc"));
        oi.setCreatedBy(rs.getObject("created_by", UUID.class));
        oi.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        oi.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return oi;
    };
}
