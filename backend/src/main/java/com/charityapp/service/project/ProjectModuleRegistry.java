package com.charityapp.service.project;

import com.charityapp.model.project.ModuleCategory;
import com.charityapp.model.project.ModuleNavigationTab;
import com.charityapp.model.project.ModuleNotificationTrigger;
import com.charityapp.model.project.ModulePermission;
import com.charityapp.model.project.ProjectModuleDescriptor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ProjectModuleRegistry {

    private final Map<String, ProjectModuleDescriptor> registry = new LinkedHashMap<>();

    public ProjectModuleRegistry() {
        registerBuiltInModules();
    }

    public synchronized void registerModule(ProjectModuleDescriptor descriptor) {
        if (descriptor == null || descriptor.getId() == null || descriptor.getId().isBlank()) {
            throw new IllegalArgumentException("Invalid module descriptor or missing ID");
        }
        registry.put(descriptor.getId(), descriptor);
    }

    public Optional<ProjectModuleDescriptor> getDescriptor(String moduleId) {
        return Optional.ofNullable(registry.get(moduleId));
    }

    public List<ProjectModuleDescriptor> getAllDescriptors() {
        return new ArrayList<>(registry.values());
    }

    public boolean exists(String moduleId) {
        return registry.containsKey(moduleId);
    }

    private void registerBuiltInModules() {
        // ==========================================
        // SECTION: GENERAL
        // Subtabs: calendar | tasks | map | statistics
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.general.calendar",
            "general.calendar",
            ModuleCategory.GENERAL,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("general:calendar:read", "general.calendar", List.of("ADMIN", "VOLUNTEER"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("calendar", "general.calendar", "/projects/:id/general?subtab=calendar", 10, "general:calendar:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.general.tasks",
            "general.tasks",
            ModuleCategory.GENERAL,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(
                new ModulePermission("general:tasks:read", "general.tasks", List.of("ADMIN", "VOLUNTEER")),
                new ModulePermission("general:tasks:write", "general.tasks", List.of("ADMIN")),
                new ModulePermission("general:tasks:delete", "general.tasks", List.of("ADMIN"))
            ),
            List.of(
                new ModuleNotificationTrigger("task.assigned", "modules.tasks.notif.assigned", Map.of("taskId", "string", "assignee", "string")),
                new ModuleNotificationTrigger("task.completed", "modules.tasks.notif.completed", Map.of("taskId", "string"))
            ),
            List.of(new ModuleNavigationTab("tasks", "general.tasks", "/projects/:id/general?subtab=tasks", 11, "general:tasks:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.general.map",
            "general.map",
            ModuleCategory.GENERAL,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("general:map:read", "general.map", List.of("ADMIN", "VOLUNTEER"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("map", "general.map", "/projects/:id/general?subtab=map", 12, "general:map:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.general.statistics",
            "common.tabStatistics",
            ModuleCategory.GENERAL,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("general:tasks:read", "common.tabStatistics", List.of("ADMIN", "VOLUNTEER"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("statistics", "common.tabStatistics", "/projects/:id/general?subtab=statistics", 13, "general:tasks:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        // ==========================================
        // SECTION: LOGISTICS
        // Subtabs: inventory | predictor | stand-stats | history | statistics
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.logistics.inventory",
            "logistics.tabInventory",
            ModuleCategory.LOGISTICS,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(
                new ModulePermission("logistics:inventory:items:read", "logistics.tabInventory", List.of("ADMIN", "LOGISTICS_HEAD")),
                new ModulePermission("logistics:inventory:items:write", "logistics.tabInventory", List.of("ADMIN", "LOGISTICS_HEAD"))
            ),
            List.of(new ModuleNotificationTrigger("inventory.low_stock", "modules.logistics.notif.low_stock", Map.of("itemId", "string", "remaining", "number"))),
            List.of(new ModuleNavigationTab("inventory", "logistics.tabInventory", "/projects/:id/logistics?subtab=inventory", 20, "logistics:inventory:items:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.logistics.predictor",
            "logistics.tabPredictor",
            ModuleCategory.LOGISTICS,
            List.of("mod.logistics.inventory"),
            Collections.emptyList(),
            List.of(new ModulePermission("logistics:inventory:items:read", "logistics.tabPredictor", List.of("ADMIN", "LOGISTICS_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("predictor", "logistics.tabPredictor", "/projects/:id/logistics?subtab=predictor", 21, "logistics:inventory:items:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.logistics.stand-stats",
            "logistics.tabStandStats",
            ModuleCategory.LOGISTICS,
            List.of("mod.logistics.inventory"),
            Collections.emptyList(),
            List.of(new ModulePermission("logistics:stands:checkout:write", "logistics.tabStandStats", List.of("ADMIN", "LOGISTICS_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("stand-stats", "logistics.tabStandStats", "/projects/:id/logistics?subtab=stand-stats", 22, "logistics:stands:checkout:write")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.logistics.history",
            "logistics.tabHistory",
            ModuleCategory.LOGISTICS,
            List.of("mod.logistics.inventory"),
            Collections.emptyList(),
            List.of(new ModulePermission("logistics:inventory:items:read", "logistics.tabHistory", List.of("ADMIN", "LOGISTICS_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("history", "logistics.tabHistory", "/projects/:id/logistics?subtab=history", 23, "logistics:inventory:items:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.logistics.statistics",
            "common.tabStatistics",
            ModuleCategory.LOGISTICS,
            List.of("mod.logistics.inventory"),
            Collections.emptyList(),
            List.of(new ModulePermission("logistics:inventory:items:read", "common.tabStatistics", List.of("ADMIN", "LOGISTICS_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("statistics", "common.tabStatistics", "/projects/:id/logistics?subtab=statistics", 24, "logistics:inventory:items:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        // ==========================================
        // SECTION: FINANCE
        // Subtabs: expenses | online-donations | stands | sponsorships | other-incomes | statistics
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.finance.expenses",
            "finance.tabExpenses",
            ModuleCategory.FINANCE,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(
                new ModulePermission("finance:expenses:read", "finance.tabExpenses", List.of("ADMIN", "FINANCE_HEAD", "FINANCE_MEMBER")),
                new ModulePermission("finance:expenses:write", "finance.tabExpenses", List.of("ADMIN", "FINANCE_HEAD")),
                new ModulePermission("finance:expenses:approve", "finance.tabExpenses", List.of("ADMIN", "FINANCE_HEAD"))
            ),
            List.of(
                new ModuleNotificationTrigger("expense.submitted", "modules.finance.notif.submitted", Map.of("expenseId", "string", "amount", "number")),
                new ModuleNotificationTrigger("expense.approved", "modules.finance.notif.approved", Map.of("expenseId", "string"))
            ),
            List.of(new ModuleNavigationTab("expenses", "finance.tabExpenses", "/projects/:id/finance?subtab=expenses", 30, "finance:expenses:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.finance.online-donations",
            "finance.tabOnlineDonations",
            ModuleCategory.FINANCE,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:donations:read", "finance.tabOnlineDonations", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("online-donations", "finance.tabOnlineDonations", "/projects/:id/finance?subtab=online-donations", 31, "finance:donations:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.finance.stands",
            "finance.tabStands",
            ModuleCategory.FINANCE,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:expenses:read", "finance.tabStands", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("stands", "finance.tabStands", "/projects/:id/finance?subtab=stands", 32, "finance:expenses:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.finance.sponsorships",
            "finance.tabSponsorships",
            ModuleCategory.FINANCE,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:donations:read", "finance.tabSponsorships", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("sponsorships", "finance.tabSponsorships", "/projects/:id/finance?subtab=sponsorships", 33, "finance:donations:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.finance.other-incomes",
            "finance.tabOtherIncomes",
            ModuleCategory.FINANCE,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:expenses:read", "finance.tabOtherIncomes", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("other-incomes", "finance.tabOtherIncomes", "/projects/:id/finance?subtab=other-incomes", 34, "finance:expenses:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.finance.statistics",
            "common.tabStatistics",
            ModuleCategory.FINANCE,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:expenses:read", "common.tabStatistics", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("statistics", "common.tabStatistics", "/projects/:id/finance?subtab=statistics", 35, "finance:expenses:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        // ==========================================
        // SECTION: HR
        // Subtabs: stands | feedback | statistics
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.hr.stands",
            "hr.subtabStands",
            ModuleCategory.HR,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(
                new ModulePermission("hr:stands:shifts:read", "hr.subtabStands", List.of("ADMIN", "HR_HEAD", "HR_MEMBER", "VOLUNTEER")),
                new ModulePermission("hr:stands:shifts:write", "hr.subtabStands", List.of("ADMIN", "HR_HEAD")),
                new ModulePermission("hr:attendance:write", "hr.subtabStands", List.of("ADMIN", "HR_HEAD", "VOLUNTEER"))
            ),
            List.of(new ModuleNotificationTrigger("shift.reminder", "modules.shifts.notif.reminder", Map.of("shiftId", "string", "userId", "string"))),
            List.of(new ModuleNavigationTab("stands", "hr.subtabStands", "/projects/:id/hr?subtab=stands", 40, "hr:stands:shifts:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.hr.feedback",
            "hr.subtabFeedback",
            ModuleCategory.HR,
            List.of("mod.hr.stands"),
            Collections.emptyList(),
            List.of(new ModulePermission("hr:stands:feedback:read", "hr.subtabFeedback", List.of("ADMIN", "HR_HEAD", "HR_MEMBER"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("feedback", "hr.subtabFeedback", "/projects/:id/hr?subtab=feedback", 41, "hr:stands:feedback:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.hr.statistics",
            "common.tabStatistics",
            ModuleCategory.HR,
            List.of("mod.hr.stands"),
            Collections.emptyList(),
            List.of(new ModulePermission("hr:stands:shifts:read", "common.tabStatistics", List.of("ADMIN", "HR_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("statistics", "common.tabStatistics", "/projects/:id/hr?subtab=statistics", 42, "hr:stands:shifts:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        // ==========================================
        // SECTION: FUNDRAISING
        // Subtabs: leads | finished | statistics
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.fundraising.leads",
            "fundraising.tab.leads",
            ModuleCategory.FUNDRAISING,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(
                new ModulePermission("finance:donations:read", "fundraising.tab.leads", List.of("ADMIN", "FINANCE_HEAD")),
                new ModulePermission("finance:donations:write", "fundraising.tab.leads", List.of("ADMIN", "FINANCE_HEAD"))
            ),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("leads", "fundraising.tab.leads", "/projects/:id/fundraising?subtab=leads", 50, "finance:donations:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.fundraising.finished",
            "fundraising.tab.finished",
            ModuleCategory.FUNDRAISING,
            List.of("mod.fundraising.leads"),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:donations:read", "fundraising.tab.finished", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("finished", "fundraising.tab.finished", "/projects/:id/fundraising?subtab=finished", 51, "finance:donations:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.fundraising.statistics",
            "common.tabStatistics",
            ModuleCategory.FUNDRAISING,
            List.of("mod.fundraising.leads"),
            Collections.emptyList(),
            List.of(new ModulePermission("finance:donations:read", "common.tabStatistics", List.of("ADMIN", "FINANCE_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("statistics", "common.tabStatistics", "/projects/:id/fundraising?subtab=statistics", 52, "finance:donations:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        // ==========================================
        // SECTION: MARKETING
        // Subtabs: resources | emails
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.marketing.resources",
            "marketing.subtabResources",
            ModuleCategory.MARKETING,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("marketing:resources:view", "marketing.subtabResources", List.of("ADMIN", "MARKETING_HEAD", "VOLUNTEER"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("resources", "marketing.subtabResources", "/projects/:id/marketing?subtab=resources", 60, "marketing:resources:view")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.marketing.emails",
            "email.studioTitle",
            ModuleCategory.MARKETING,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("marketing:emails:view", "email.studioTitle", List.of("ADMIN", "MARKETING_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("emails", "email.studioTitle", "/projects/:id/marketing?subtab=emails", 61, "marketing:emails:view")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        // ==========================================
        // SECTION: LEGAL
        // Subtabs: templates | generator | contracts | statistics
        // ==========================================
        registerModule(new ProjectModuleDescriptor(
            "mod.legal.templates",
            "legal.tabTemplates",
            ModuleCategory.LEGAL,
            Collections.emptyList(),
            Collections.emptyList(),
            List.of(new ModulePermission("legal:contracts:read", "legal.tabTemplates", List.of("ADMIN", "LEGAL_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("templates", "legal.tabTemplates", "/projects/:id/legal?subtab=templates", 70, "legal:contracts:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.legal.generator",
            "legal.tabGenerator",
            ModuleCategory.LEGAL,
            List.of("mod.legal.templates"),
            Collections.emptyList(),
            List.of(new ModulePermission("legal:contracts:write", "legal.tabGenerator", List.of("ADMIN", "LEGAL_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("generator", "legal.tabGenerator", "/projects/:id/legal?subtab=generator", 71, "legal:contracts:write")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.legal.contracts",
            "legal.tabContracts",
            ModuleCategory.LEGAL,
            List.of("mod.legal.templates"),
            Collections.emptyList(),
            List.of(
                new ModulePermission("legal:contracts:read", "legal.tabContracts", List.of("ADMIN", "LEGAL_HEAD")),
                new ModulePermission("legal:contracts:write", "legal.tabContracts", List.of("ADMIN", "LEGAL_HEAD"))
            ),
            List.of(new ModuleNotificationTrigger("contract.signed", "modules.legal.notif.signed", Map.of("contractId", "string"))),
            List.of(new ModuleNavigationTab("contracts", "legal.tabContracts", "/projects/:id/legal?subtab=contracts", 72, "legal:contracts:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));

        registerModule(new ProjectModuleDescriptor(
            "mod.legal.statistics",
            "common.tabStatistics",
            ModuleCategory.LEGAL,
            List.of("mod.legal.templates"),
            Collections.emptyList(),
            List.of(new ModulePermission("legal:contracts:read", "common.tabStatistics", List.of("ADMIN", "LEGAL_HEAD"))),
            Collections.emptyList(),
            List.of(new ModuleNavigationTab("statistics", "common.tabStatistics", "/projects/:id/legal?subtab=statistics", 73, "legal:contracts:read")),
            Collections.emptyList(),
            Collections.emptyMap(),
            false
        ));
    }
}
