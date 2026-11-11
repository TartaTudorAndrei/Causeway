package com.charityapp.service.sync.exporters;

import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.general.GeneralTask;
import com.charityapp.repository.general.GeneralRepository;
import com.charityapp.service.sync.DashboardExportable;
import com.charityapp.service.sync.MultiTabDashboardExportable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class GeneralDashboardExporter implements MultiTabDashboardExportable {

    private final GeneralRepository generalRepository;

    public GeneralDashboardExporter(GeneralRepository generalRepository) {
        this.generalRepository = generalRepository;
    }

    @Override
    public List<DashboardExportable> getTabs() {
        return List.of(
            getTasksTab(),
            getEventsTab()
        );
    }

    private DashboardExportable getTasksTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "General_Tasks"; }
            @Override
            public String getDomain() { return "GENERAL"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Task Title", "Department", "Priority", "Status", "Assignee", "Start Date", "Due Date", "Description", "Created By");
            }
            @Override
            public List<List<Object>> getRows() {
                List<GeneralTask> tasks = generalRepository.findAllTasks();
                List<List<Object>> taskRows = new ArrayList<>();
                for (GeneralTask t : tasks) {
                    taskRows.add(List.of(
                            t.getTitle() != null ? t.getTitle() : "",
                            t.getDepartment() != null ? t.getDepartment() : "General",
                            t.getPriority() != null ? t.getPriority().toUpperCase() : "MEDIUM",
                            t.getStatus() != null ? t.getStatus().toUpperCase() : "TODO",
                            t.getAssignee() != null ? t.getAssignee() : "",
                            t.getStartDate() != null ? t.getStartDate() : "",
                            t.getDueDate() != null ? t.getDueDate() : "",
                            t.getDescription() != null ? t.getDescription() : "",
                            t.getCreatedBy() != null ? t.getCreatedBy() : ""
                    ));
                }
                return taskRows;
            }
        };
    }

    private DashboardExportable getEventsTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "General_Events"; }
            @Override
            public String getDomain() { return "GENERAL"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Event Title", "Start Date", "End Date", "Time", "Department", "Special Demand", "Demand Multiplier", "Demand Tag", "Description");
            }
            @Override
            public List<List<Object>> getRows() {
                List<GeneralEvent> events = generalRepository.findAllEvents();
                List<List<Object>> eventRows = new ArrayList<>();
                for (GeneralEvent ev : events) {
                    eventRows.add(List.of(
                            ev.getTitle() != null ? ev.getTitle() : "",
                            ev.getDate() != null ? ev.getDate() : "",
                            ev.getEndDate() != null ? ev.getEndDate() : ev.getDate(),
                            ev.getTime() != null ? ev.getTime() : "",
                            ev.getDepartment() != null ? ev.getDepartment() : "General",
                            ev.isSpecialDemand() ? "YES" : "NO",
                            ev.getDemandMultiplier(),
                            ev.getDemandTag() != null ? ev.getDemandTag() : "",
                            ev.getDescription() != null ? ev.getDescription() : ""
                    ));
                }
                return eventRows;
            }
        };
    }
}
