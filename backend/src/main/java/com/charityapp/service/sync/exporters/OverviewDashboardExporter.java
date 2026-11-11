package com.charityapp.service.sync.exporters;

import com.charityapp.model.finance.FinanceExpense;
import com.charityapp.model.finance.FinanceOnlineDonation;
import com.charityapp.model.finance.FinanceOtherIncome;
import com.charityapp.model.finance.FinanceSponsorship;
import com.charityapp.model.finance.FinanceStand;
import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.general.GeneralTask;
import com.charityapp.model.hr.HrMember;
import com.charityapp.model.hr.HrStand;
import com.charityapp.model.logistics.LocationStock;
import com.charityapp.model.logistics.StockItem;
import com.charityapp.repository.finance.FinanceSheetRepository;
import com.charityapp.repository.general.GeneralRepository;
import com.charityapp.repository.hr.HrRepository;
import com.charityapp.repository.logistics.LocationStockRepository;
import com.charityapp.repository.logistics.StockItemRepository;
import com.charityapp.service.sync.DashboardExportable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class OverviewDashboardExporter implements DashboardExportable {

    private final FinanceSheetRepository financeSheetRepository;
    private final HrRepository hrRepository;
    private final StockItemRepository itemRepository;
    private final LocationStockRepository stockRepository;
    private final GeneralRepository generalRepository;

    public OverviewDashboardExporter(FinanceSheetRepository financeSheetRepository,
                                     HrRepository hrRepository,
                                     StockItemRepository itemRepository,
                                     LocationStockRepository stockRepository,
                                     GeneralRepository generalRepository) {
        this.financeSheetRepository = financeSheetRepository;
        this.hrRepository = hrRepository;
        this.itemRepository = itemRepository;
        this.stockRepository = stockRepository;
        this.generalRepository = generalRepository;
    }

    @Override
    public String getTabName() { return "Dashboard_Overview"; }

    @Override
    public String getDomain() { return "OVERVIEW"; }

    @Override
    public boolean isOverview() { return true; }

    @Override
    public List<String> getHeaders() {
        return List.of("Domain Section", "Metric Indicator", "Current Value", "Unit", "Key Insight / Status");
    }

    @Override
    public List<List<Object>> getRows() {
        List<FinanceStand> stands = financeSheetRepository.findAllStands();
        List<FinanceExpense> expenses = financeSheetRepository.findAllExpenses();
        List<FinanceOtherIncome> otherIncomes = financeSheetRepository.findAllOtherIncomes();
        List<FinanceSponsorship> sponsorships = financeSheetRepository.findAllSponsorships();
        List<FinanceOnlineDonation> onlineDonations = financeSheetRepository.findAllOnlineDonations();

        List<StockItem> items = itemRepository.findAll();
        List<LocationStock> stocks = stockRepository.findAll();

        List<HrMember> members = hrRepository.findAllMembers();
        List<HrStand> hrStands = hrRepository.findAllStands();

        List<GeneralTask> tasks = generalRepository.findAllTasks();
        List<GeneralEvent> events = generalRepository.findAllEvents();

        double standTotal = stands.stream()
                .mapToDouble(s -> (s.getCashCollected() != null ? s.getCashCollected().doubleValue() : 0.0) +
                        (s.getPosCardCollected() != null ? s.getPosCardCollected().doubleValue() : 0.0))
                .sum();

        double donationsTotal = onlineDonations.stream()
                .mapToDouble(d -> d.getAmount() != null ? d.getAmount().doubleValue() : 0.0)
                .sum();

        double otherIncomeTotal = otherIncomes.stream()
                .mapToDouble(oi -> oi.getAmount() != null ? oi.getAmount().doubleValue() : 0.0)
                .sum();

        double sponsorshipsTotal = sponsorships.stream()
                .mapToDouble(sp -> sp.getAgreedAmount() != null ? sp.getAgreedAmount().doubleValue() : 0.0)
                .sum();

        double expensesTotal = expenses.stream()
                .mapToDouble(e -> e.getAmount() != null ? e.getAmount().doubleValue() : 0.0)
                .sum();

        double netBalance = (standTotal + donationsTotal + otherIncomeTotal + sponsorshipsTotal) - expensesTotal;
        int totalVolunteers = members.size();
        int totalStandsCount = hrStands.size();
        int totalItemsCount = items.size();
        int totalStockVolume = stocks.stream().mapToInt(LocationStock::getQuantity).sum();
        long openTasksCount = tasks.stream().filter(t -> !"DONE".equalsIgnoreCase(t.getStatus()) && !"COMPLETED".equalsIgnoreCase(t.getStatus())).count();
        int upcomingEventsCount = events.size();

        List<List<Object>> overviewRows = new ArrayList<>();

        overviewRows.add(List.of("FINANCE", "Stand Total Revenues (EoD)", standTotal, "RON", "Total cash & card from active stands"));
        overviewRows.add(List.of("FINANCE", "Online Donations", donationsTotal, "RON", "Stripe & online payment contributions"));
        overviewRows.add(List.of("FINANCE", "Agreed Sponsorships", sponsorshipsTotal, "RON", "Corporate & partner pledged funds"));
        overviewRows.add(List.of("FINANCE", "Other Incomes", otherIncomeTotal, "RON", "Grants, direct transfers & extra income"));
        overviewRows.add(List.of("FINANCE", "Total Recorded Expenses", expensesTotal, "RON", "Operational & logistics outlays"));
        overviewRows.add(List.of("FINANCE", "Net Operating Balance", netBalance, "RON", netBalance >= 0 ? "SURPLUS" : "DEFICIT"));

        overviewRows.add(List.of("HR & VOLUNTEERING", "Total Team Members & Volunteers", (double) totalVolunteers, "members", "Active registered volunteers & team"));
        overviewRows.add(List.of("HR & VOLUNTEERING", "Configured Event Stands", (double) totalStandsCount, "stands", "Physical fundraising & outreach stands"));

        overviewRows.add(List.of("LOGISTICS", "Catalog Item SKUs", (double) totalItemsCount, "SKUs", "Tracked merchandise, cups & materials"));
        overviewRows.add(List.of("LOGISTICS", "Total In-Stock Volume", (double) totalStockVolume, "units", "Sum of inventory across all locations"));

        overviewRows.add(List.of("GENERAL & OPS", "Pending Operational Tasks", (double) openTasksCount, "tasks", "Open tasks across all departments"));
        overviewRows.add(List.of("GENERAL & OPS", "Scheduled Calendar Events", (double) upcomingEventsCount, "events", "Upcoming charity & operational events"));

        overviewRows.add(List.of("", "", "", "", ""));
        overviewRows.add(List.of("INFO", "PROTECTION POLICY", "READ-ONLY", "LOCKED", "Tabs are synchronized with the central database. Add new custom tabs for extra sheets."));

        return overviewRows;
    }
}
