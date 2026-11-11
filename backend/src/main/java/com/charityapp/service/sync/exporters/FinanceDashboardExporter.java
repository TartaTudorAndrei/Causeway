package com.charityapp.service.sync.exporters;

import com.charityapp.model.finance.*;
import com.charityapp.repository.finance.FinanceSheetRepository;
import com.charityapp.service.sync.DashboardExportable;
import com.charityapp.service.sync.MultiTabDashboardExportable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class FinanceDashboardExporter implements MultiTabDashboardExportable {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final FinanceSheetRepository financeSheetRepository;

    public FinanceDashboardExporter(FinanceSheetRepository financeSheetRepository) {
        this.financeSheetRepository = financeSheetRepository;
    }

    @Override
    public List<DashboardExportable> getTabs() {
        return List.of(
            getStandTab(),
            getExpensesTab(),
            getOtherIncomeTab(),
            getSponsorshipsTab(),
            getDonationsTab()
        );
    }

    private DashboardExportable getStandTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Finance_Stands_EoD"; }
            @Override
            public String getDomain() { return "FINANCE"; }
            @Override
            public List<String> getHeaders() {
                return List.of(
                    "Event Date", "Stand Location", "Shift Name", "Finance Responsible",
                    "Cash Collected (RON)", "Card POS (RON)", "Total Revenue (RON)",
                    "Opening Balance (RON)", "Closing Balance (RON)", "Discrepancy (RON)", "Status", "Notes"
                );
            }
            @Override
            public List<List<Object>> getRows() {
                List<FinanceStand> stands = financeSheetRepository.findAllStands();
                List<List<Object>> standRows = new ArrayList<>();
                for (FinanceStand s : stands) {
                    BigDecimal cash = s.getCashCollected() != null ? s.getCashCollected() : BigDecimal.ZERO;
                    BigDecimal pos = s.getPosCardCollected() != null ? s.getPosCardCollected() : BigDecimal.ZERO;
                    BigDecimal total = cash.add(pos);
                    standRows.add(List.of(
                            s.getEventDate() != null ? s.getEventDate().toString() : "",
                            s.getStandLocation() != null ? s.getStandLocation() : "",
                            s.getShiftName() != null ? s.getShiftName() : "",
                            s.getFinanceResponsibleName() != null ? s.getFinanceResponsibleName() : "",
                            cash.doubleValue(),
                            pos.doubleValue(),
                            total.doubleValue(),
                            s.getOpeningBalance() != null ? s.getOpeningBalance().doubleValue() : 0.0,
                            s.getClosingBalance() != null ? s.getClosingBalance().doubleValue() : 0.0,
                            s.getDiscrepancyAmount() != null ? s.getDiscrepancyAmount().doubleValue() : 0.0,
                            s.getStatus() != null ? s.getStatus() : "",
                            s.getDiscrepancyNotes() != null ? s.getDiscrepancyNotes() : ""
                    ));
                }
                return standRows;
            }
        };
    }

    private DashboardExportable getExpensesTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Finance_Expenses"; }
            @Override
            public String getDomain() { return "FINANCE"; }
            @Override
            public List<String> getHeaders() {
                return List.of(
                    "Transaction Date", "Expense Name", "Amount", "Currency", "Category",
                    "Payment Method", "Department / Campaign", "Description", "Receipt URL"
                );
            }
            @Override
            public List<List<Object>> getRows() {
                List<FinanceExpense> expenses = financeSheetRepository.findAllExpenses();
                List<List<Object>> expenseRows = new ArrayList<>();
                for (FinanceExpense e : expenses) {
                    expenseRows.add(List.of(
                            e.getTransactionDate() != null ? e.getTransactionDate().toString() : "",
                            e.getName() != null ? e.getName() : "",
                            e.getAmount() != null ? e.getAmount().doubleValue() : 0.0,
                            e.getCurrency() != null ? e.getCurrency() : "RON",
                            e.getCategory() != null ? e.getCategory() : "",
                            e.getPaymentMethod() != null ? e.getPaymentMethod() : "",
                            e.getCampaignDepartment() != null ? e.getCampaignDepartment() : "",
                            e.getDescription() != null ? e.getDescription() : "",
                            e.getReceiptAttachment() != null ? e.getReceiptAttachment() : ""
                    ));
                }
                return expenseRows;
            }
        };
    }

    private DashboardExportable getOtherIncomeTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Finance_Other_Income"; }
            @Override
            public String getDomain() { return "FINANCE"; }
            @Override
            public List<String> getHeaders() {
                return List.of(
                    "Transaction Date", "Source / Payer", "Amount", "Currency", "Category", "Campaign", "Description", "Reference Doc"
                );
            }
            @Override
            public List<List<Object>> getRows() {
                List<FinanceOtherIncome> otherIncomes = financeSheetRepository.findAllOtherIncomes();
                List<List<Object>> incomeRows = new ArrayList<>();
                for (FinanceOtherIncome oi : otherIncomes) {
                    incomeRows.add(List.of(
                            oi.getTransactionDate() != null ? oi.getTransactionDate().toString() : "",
                            oi.getSourcePayer() != null ? oi.getSourcePayer() : "",
                            oi.getAmount() != null ? oi.getAmount().doubleValue() : 0.0,
                            oi.getCurrency() != null ? oi.getCurrency() : "RON",
                            oi.getCategory() != null ? oi.getCategory() : "",
                            oi.getCampaign() != null ? oi.getCampaign() : "",
                            oi.getDescription() != null ? oi.getDescription() : "",
                            oi.getReferenceDoc() != null ? oi.getReferenceDoc() : ""
                    ));
                }
                return incomeRows;
            }
        };
    }

    private DashboardExportable getSponsorshipsTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Finance_Sponsorships"; }
            @Override
            public String getDomain() { return "FINANCE"; }
            @Override
            public List<String> getHeaders() {
                return List.of(
                    "Sponsor Name", "Contact Person", "Contact Email", "Tier", "Agreed Amount",
                    "Currency", "Payment Status", "Campaign", "Received Date", "Contract URL"
                );
            }
            @Override
            public List<List<Object>> getRows() {
                List<FinanceSponsorship> sponsorships = financeSheetRepository.findAllSponsorships();
                List<List<Object>> sponsorshipRows = new ArrayList<>();
                for (FinanceSponsorship sp : sponsorships) {
                    sponsorshipRows.add(List.of(
                            sp.getSponsorName() != null ? sp.getSponsorName() : "",
                            sp.getContactPerson() != null ? sp.getContactPerson() : "",
                            sp.getContactEmail() != null ? sp.getContactEmail() : "",
                            sp.getTier() != null ? sp.getTier() : "",
                            sp.getAgreedAmount() != null ? sp.getAgreedAmount().doubleValue() : 0.0,
                            sp.getCurrency() != null ? sp.getCurrency() : "RON",
                            sp.getPaymentStatus() != null ? sp.getPaymentStatus() : "",
                            sp.getCampaign() != null ? sp.getCampaign() : "",
                            sp.getReceivedDate() != null ? sp.getReceivedDate().toString() : "",
                            sp.getContractUrl() != null ? sp.getContractUrl() : ""
                    ));
                }
                return sponsorshipRows;
            }
        };
    }

    private DashboardExportable getDonationsTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "Finance_Donations"; }
            @Override
            public String getDomain() { return "FINANCE"; }
            @Override
            public List<String> getHeaders() {
                return List.of(
                    "Transaction Date", "Donor Name", "Donor Email", "Amount", "Currency",
                    "Processor Fee", "Campaign", "Status", "Transaction ID"
                );
            }
            @Override
            public List<List<Object>> getRows() {
                List<FinanceOnlineDonation> onlineDonations = financeSheetRepository.findAllOnlineDonations();
                List<List<Object>> donationRows = new ArrayList<>();
                for (FinanceOnlineDonation d : onlineDonations) {
                    donationRows.add(List.of(
                            d.getTransactionDate() != null ? d.getTransactionDate().format(DATE_TIME_FORMATTER) : "",
                            d.getDonorName() != null ? d.getDonorName() : "Anonim",
                            d.getDonorEmail() != null ? d.getDonorEmail() : "",
                            d.getAmount() != null ? d.getAmount().doubleValue() : 0.0,
                            d.getCurrency() != null ? d.getCurrency() : "RON",
                            d.getProcessingFee() != null ? d.getProcessingFee().doubleValue() : 0.0,
                            d.getCampaign() != null ? d.getCampaign() : "General",
                            d.getStatus() != null ? d.getStatus() : "PAID",
                            d.getTransactionId() != null ? d.getTransactionId() : ""
                    ));
                }
                return donationRows;
            }
        };
    }
}
