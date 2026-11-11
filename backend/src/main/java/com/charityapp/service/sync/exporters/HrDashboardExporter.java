package com.charityapp.service.sync.exporters;

import com.charityapp.model.hr.HrMember;
import com.charityapp.model.hr.HrShift;
import com.charityapp.model.hr.HrStand;
import com.charityapp.repository.hr.HrRepository;
import com.charityapp.service.sync.DashboardExportable;
import com.charityapp.service.sync.MultiTabDashboardExportable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class HrDashboardExporter implements MultiTabDashboardExportable {

    private final HrRepository hrRepository;

    public HrDashboardExporter(HrRepository hrRepository) {
        this.hrRepository = hrRepository;
    }

    @Override
    public List<DashboardExportable> getTabs() {
        return List.of(
            getMembersTab(),
            getStandsShiftsTab()
        );
    }

    private DashboardExportable getMembersTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "HR_Team_Members"; }
            @Override
            public String getDomain() { return "HR"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Full Name", "Email", "Phone", "Role", "Department", "Onboarding Status", "Notes");
            }
            @Override
            public List<List<Object>> getRows() {
                List<HrMember> members = hrRepository.findAllMembers();
                List<List<Object>> memberRows = new ArrayList<>();
                for (HrMember m : members) {
                    memberRows.add(List.of(
                            m.getFullName() != null ? m.getFullName() : "",
                            m.getEmail() != null ? m.getEmail() : "",
                            m.getPhone() != null ? m.getPhone() : "",
                            m.getRole() != null ? m.getRole() : "VOLUNTEER",
                            m.getDepartment() != null ? m.getDepartment() : "General",
                            m.getOnboardingStatus() != null ? m.getOnboardingStatus() : "Active",
                            m.getNotes() != null ? m.getNotes() : ""
                    ));
                }
                return memberRows;
            }
        };
    }

    private DashboardExportable getStandsShiftsTab() {
        return new DashboardExportable() {
            @Override
            public String getTabName() { return "HR_Stands_Shifts"; }
            @Override
            public String getDomain() { return "HR"; }
            @Override
            public List<String> getHeaders() {
                return List.of("Event Date", "Location Name", "Event Name", "Stand Status", "Shift Name", "Time Range", "Assigned Members", "Notes");
            }
            @Override
            public List<List<Object>> getRows() {
                List<HrStand> hrStands = hrRepository.findAllStands();
                List<List<Object>> hrStandRows = new ArrayList<>();
                for (HrStand stand : hrStands) {
                    if (stand.getShifts() != null && !stand.getShifts().isEmpty()) {
                        for (HrShift sh : stand.getShifts()) {
                            String assignedSummary = sh.getAssignments() != null
                                    ? sh.getAssignments().stream().map(a -> a.getMemberName() + " (" + a.getRoleName() + ")").collect(Collectors.joining(", "))
                                    : "";
                            hrStandRows.add(List.of(
                                    stand.getEventDate() != null ? stand.getEventDate().toString() : "",
                                    stand.getLocationName() != null ? stand.getLocationName() : "",
                                    stand.getEventName() != null ? stand.getEventName() : "",
                                    stand.getStatus() != null ? stand.getStatus() : "",
                                    sh.getShiftName() != null ? sh.getShiftName() : "",
                                    (sh.getStartTime() != null ? sh.getStartTime() : "") + " - " + (sh.getEndTime() != null ? sh.getEndTime() : ""),
                                    assignedSummary,
                                    stand.getNotes() != null ? stand.getNotes() : ""
                            ));
                        }
                    } else {
                        hrStandRows.add(List.of(
                                stand.getEventDate() != null ? stand.getEventDate().toString() : "",
                                stand.getLocationName() != null ? stand.getLocationName() : "",
                                stand.getEventName() != null ? stand.getEventName() : "",
                                stand.getStatus() != null ? stand.getStatus() : "",
                                "-", "-", "-",
                                stand.getNotes() != null ? stand.getNotes() : ""
                        ));
                    }
                }
                return hrStandRows;
            }
        };
    }
}
