package com.charityapp.model.hr;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class HrShift {
    private UUID id;
    private UUID standId;
    private String shiftName;
    private String startTime;
    private String endTime;
    private int neededVolunteers = 1;
    private int neededLogistics = 1;
    private int neededFinance = 1;
    private List<HrShiftAssignment> assignments = new ArrayList<>();

    public HrShift() {}

    public HrShift(UUID id, UUID standId, String shiftName, String startTime, String endTime) {
        this.id = id != null ? id : UUID.randomUUID();
        this.standId = standId;
        this.shiftName = shiftName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.neededVolunteers = 1;
        this.neededLogistics = 1;
        this.neededFinance = 1;
    }

    public HrShift(UUID id, UUID standId, String shiftName, String startTime, String endTime,
                   int neededVolunteers, int neededLogistics, int neededFinance) {
        this.id = id != null ? id : UUID.randomUUID();
        this.standId = standId;
        this.shiftName = shiftName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.neededVolunteers = neededVolunteers >= 0 ? neededVolunteers : 0;
        this.neededLogistics = neededLogistics >= 0 ? neededLogistics : 0;
        this.neededFinance = neededFinance >= 0 ? neededFinance : 0;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getStandId() { return standId; }
    public void setStandId(UUID standId) { this.standId = standId; }

    public String getShiftName() { return shiftName; }
    public void setShiftName(String shiftName) { this.shiftName = shiftName; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public int getNeededVolunteers() { return neededVolunteers; }
    public void setNeededVolunteers(int neededVolunteers) { this.neededVolunteers = neededVolunteers; }

    public int getNeededLogistics() { return neededLogistics; }
    public void setNeededLogistics(int neededLogistics) { this.neededLogistics = neededLogistics; }

    public int getNeededFinance() { return neededFinance; }
    public void setNeededFinance(int neededFinance) { this.neededFinance = neededFinance; }

    public List<HrShiftAssignment> getAssignments() { return assignments; }
    public void setAssignments(List<HrShiftAssignment> assignments) { this.assignments = assignments; }
}

