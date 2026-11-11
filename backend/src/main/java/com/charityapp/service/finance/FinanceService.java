package com.charityapp.service.finance;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.event.DashboardDataChangedEvent;
import com.charityapp.model.finance.*;
import com.charityapp.repository.finance.FinanceSheetRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class FinanceService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FinanceService.class);

    private final FinanceSheetRepository financeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final com.charityapp.service.google.GoogleDriveService googleDriveService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.notification.WhatsAppNotificationService whatsAppNotificationService;

    public FinanceService(
            FinanceSheetRepository financeRepository,
            ApplicationEventPublisher eventPublisher,
            @org.springframework.context.annotation.Lazy com.charityapp.service.google.GoogleDriveService googleDriveService) {
        this.financeRepository = financeRepository;
        this.eventPublisher = eventPublisher;
        this.googleDriveService = googleDriveService;
    }


    public List<FinanceExpense> getExpenses() {
        return financeRepository.findAllExpenses();
    }

    public List<String> getExpenseCategories() {
        return financeRepository.findDistinctExpenseCategories();
    }

    public FinanceExpense createExpense(FinanceExpense expense) {
        FinanceExpense saved = financeRepository.saveExpense(expense);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "createExpense"));
        return saved;
    }

    public void updateExpense(FinanceExpense expense) {
        financeRepository.updateExpense(expense);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "updateExpense"));
    }

    public void deleteExpense(UUID id) {
        if (id != null) {
            financeRepository.findExpenseById(id).ifPresent(expense -> {
                String receipt = expense.getReceiptAttachment();
                if (receipt != null && !receipt.isBlank() && googleDriveService != null) {
                    try {
                        googleDriveService.deleteFile(receipt);
                    } catch (Exception e) {
                        log.warn("Failed to delete receipt file from Google Drive for expense {}: {}", id, e.getMessage());
                    }
                }
            });
        }
        financeRepository.deleteExpense(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "deleteExpense"));
    }

    public List<FinanceOnlineDonation> getOnlineDonations() {
        return financeRepository.findAllOnlineDonations();
    }

    public FinanceOnlineDonation recordOnlineDonation(FinanceOnlineDonation donation) {
        FinanceOnlineDonation saved = financeRepository.saveOnlineDonation(donation);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "recordDonation"));
        return saved;
    }

    public List<FinanceStand> getStands() {
        return financeRepository.findAllStands();
    }

    public FinanceStand submitStandEoD(FinanceStand stand) {
        FinanceStand saved = financeRepository.saveStand(stand);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "submitStandEoD"));

        if (whatsAppNotificationService != null) {
            try {
                whatsAppNotificationService.sendStandEoDDoubleCompletionAlert(saved);
            } catch (Exception ignored) {}
        }

        return saved;
    }


    public void updateStand(FinanceStand stand) {
        financeRepository.updateStand(stand);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "updateStand"));
    }

    public void deleteStand(UUID id) {
        financeRepository.deleteStand(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "deleteStand"));
    }

    public List<FinanceSponsorship> getSponsorships() {
        return financeRepository.findAllSponsorships();
    }

    public FinanceSponsorship createSponsorship(FinanceSponsorship sponsorship) {
        FinanceSponsorship saved = financeRepository.saveSponsorship(sponsorship);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "createSponsorship"));
        return saved;
    }

    public void updateSponsorship(FinanceSponsorship sponsorship) {
        financeRepository.updateSponsorship(sponsorship);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "updateSponsorship"));
    }

    public void deleteSponsorship(UUID id) {
        financeRepository.deleteSponsorship(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "deleteSponsorship"));
    }

    public List<FinanceOtherIncome> getOtherIncomes() {
        return financeRepository.findAllOtherIncomes();
    }

    public FinanceOtherIncome createOtherIncome(FinanceOtherIncome income) {
        FinanceOtherIncome saved = financeRepository.saveOtherIncome(income);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "createOtherIncome"));
        return saved;
    }

    public void updateOtherIncome(FinanceOtherIncome income) {
        financeRepository.updateOtherIncome(income);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "updateOtherIncome"));
    }

    public void deleteOtherIncome(UUID id) {
        financeRepository.deleteOtherIncome(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("Finance", "deleteOtherIncome"));
    }

    public Map<String, Object> getFinancialStats() {
        List<FinanceExpense> expenses = getExpenses();
        List<FinanceOnlineDonation> onlineDonations = getOnlineDonations();
        List<FinanceStand> stands = getStands();
        List<FinanceSponsorship> sponsorships = getSponsorships();
        List<FinanceOtherIncome> otherIncomes = getOtherIncomes();

        BigDecimal totalExpenses = expenses.stream()
                .map(FinanceExpense::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOnlineDonations = onlineDonations.stream()
                .filter(d -> "COMPLETED".equalsIgnoreCase(d.getStatus()))
                .map(FinanceOnlineDonation::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalStandsRevenue = stands.stream()
                .map(FinanceStand::getTotalCollected)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSponsorshipsReceived = sponsorships.stream()
                .filter(s -> "Funds Received".equalsIgnoreCase(s.getPaymentStatus()))
                .map(FinanceSponsorship::getAgreedAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSponsorshipsPledged = sponsorships.stream()
                .map(FinanceSponsorship::getAgreedAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOtherIncomes = otherIncomes.stream()
                .map(FinanceOtherIncome::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalIncome = totalOnlineDonations
                .add(totalStandsRevenue)
                .add(totalSponsorshipsReceived)
                .add(totalOtherIncomes);

        BigDecimal netCashFlow = totalIncome.subtract(totalExpenses);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalIncome", totalIncome);
        stats.put("totalExpenses", totalExpenses);
        stats.put("netCashFlow", netCashFlow);
        stats.put("onlineDonationsTotal", totalOnlineDonations);
        stats.put("standsRevenueTotal", totalStandsRevenue);
        stats.put("sponsorshipsReceivedTotal", totalSponsorshipsReceived);
        stats.put("sponsorshipsPledgedTotal", totalSponsorshipsPledged);
        stats.put("otherIncomesTotal", totalOtherIncomes);
        stats.put("expenseCount", expenses.size());
        stats.put("onlineDonationsCount", onlineDonations.size());
        stats.put("standsCount", stands.size());
        stats.put("sponsorshipsCount", sponsorships.size());
        stats.put("otherIncomesCount", otherIncomes.size());

        return stats;
    }
}
