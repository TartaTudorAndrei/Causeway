package com.charityapp.model.hr;

import java.util.Map;

public class HrStats {
    private double shiftCoverageRate; // % e.g., 92.5
    private int totalVolunteerHoursLogged;
    private int totalStandsCount;
    private int totalMembersCount;
    private int activeMembersCount;
    private Map<String, Integer> attendanceByStand;
    private Map<String, Integer> roleDistribution;
    private Map<String, Integer> onboardingStatusBreakdown;

    public HrStats() {}

    public HrStats(double shiftCoverageRate, int totalVolunteerHoursLogged, int totalStandsCount,
                   int totalMembersCount, int activeMembersCount, Map<String, Integer> attendanceByStand,
                   Map<String, Integer> roleDistribution, Map<String, Integer> onboardingStatusBreakdown) {
        this.shiftCoverageRate = shiftCoverageRate;
        this.totalVolunteerHoursLogged = totalVolunteerHoursLogged;
        this.totalStandsCount = totalStandsCount;
        this.totalMembersCount = totalMembersCount;
        this.activeMembersCount = activeMembersCount;
        this.attendanceByStand = attendanceByStand;
        this.roleDistribution = roleDistribution;
        this.onboardingStatusBreakdown = onboardingStatusBreakdown;
    }

    public double getShiftCoverageRate() { return shiftCoverageRate; }
    public void setShiftCoverageRate(double shiftCoverageRate) { this.shiftCoverageRate = shiftCoverageRate; }

    public int getTotalVolunteerHoursLogged() { return totalVolunteerHoursLogged; }
    public void setTotalVolunteerHoursLogged(int totalVolunteerHoursLogged) { this.totalVolunteerHoursLogged = totalVolunteerHoursLogged; }

    public int getTotalStandsCount() { return totalStandsCount; }
    public void setTotalStandsCount(int totalStandsCount) { this.totalStandsCount = totalStandsCount; }

    public int getTotalMembersCount() { return totalMembersCount; }
    public void setTotalMembersCount(int totalMembersCount) { this.totalMembersCount = totalMembersCount; }

    public int getActiveMembersCount() { return activeMembersCount; }
    public void setActiveMembersCount(int activeMembersCount) { this.activeMembersCount = activeMembersCount; }

    public Map<String, Integer> getAttendanceByStand() { return attendanceByStand; }
    public void setAttendanceByStand(Map<String, Integer> attendanceByStand) { this.attendanceByStand = attendanceByStand; }

    public Map<String, Integer> getRoleDistribution() { return roleDistribution; }
    public void setRoleDistribution(Map<String, Integer> roleDistribution) { this.roleDistribution = roleDistribution; }

    public Map<String, Integer> getOnboardingStatusBreakdown() { return onboardingStatusBreakdown; }
    public void setOnboardingStatusBreakdown(Map<String, Integer> onboardingStatusBreakdown) { this.onboardingStatusBreakdown = onboardingStatusBreakdown; }
}
