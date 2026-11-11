package com.charityapp.model.hr;

import java.util.UUID;

public class HrShiftAssignment {
    private UUID id;
    private UUID shiftId;
    private UUID memberId;
    private String memberName;
    private String memberEmail;
    private String memberPhone;
    private String memberClub;
    private UUID roleId;
    private String roleName;
    private String attendanceStatus; // 'WAITING', 'PRESENT', 'ABSENT', 'LATE'
    private boolean eodSubmitted;
    private String assignmentStatus; // 'CONFIRMED', 'PENDING_APPROVAL', 'CANCELLED'
    private java.time.LocalDateTime expiresAt;
    private UUID approvedBy;
    private java.time.LocalDateTime approvedAt;
    private java.time.LocalDateTime checkedInAt;
    private String checkinMethod; // 'MANUAL', 'GPS', 'QR'
    private Double checkinLat;
    private Double checkinLng;

    public HrShiftAssignment() {
        this.attendanceStatus = "WAITING";
        this.assignmentStatus = "CONFIRMED";
    }

    public HrShiftAssignment(UUID id, UUID shiftId, UUID memberId, String memberName,
                              String memberEmail, UUID roleId, String roleName, String attendanceStatus) {
        this(id, shiftId, memberId, memberName, memberEmail, roleId, roleName, attendanceStatus, "CONFIRMED", null);
    }

    public HrShiftAssignment(UUID id, UUID shiftId, UUID memberId, String memberName,
                              String memberEmail, UUID roleId, String roleName, String attendanceStatus,
                              String assignmentStatus, java.time.LocalDateTime expiresAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.shiftId = shiftId;
        this.memberId = memberId;
        this.memberName = memberName;
        this.memberEmail = memberEmail;
        this.roleId = roleId;
        this.roleName = roleName;
        this.attendanceStatus = (attendanceStatus != null && !attendanceStatus.isBlank() && !"ASSIGNED".equalsIgnoreCase(attendanceStatus))
                ? attendanceStatus : "WAITING";
        this.eodSubmitted = false;
        this.assignmentStatus = assignmentStatus != null ? assignmentStatus : "CONFIRMED";
        this.expiresAt = expiresAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getShiftId() { return shiftId; }
    public void setShiftId(UUID shiftId) { this.shiftId = shiftId; }

    public UUID getMemberId() { return memberId; }
    public void setMemberId(UUID memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberEmail() { return memberEmail; }
    public void setMemberEmail(String memberEmail) { this.memberEmail = memberEmail; }

    public String getMemberPhone() { return memberPhone; }
    public void setMemberPhone(String memberPhone) { this.memberPhone = memberPhone; }

    public String getMemberClub() { return memberClub; }
    public void setMemberClub(String memberClub) { this.memberClub = memberClub; }

    public UUID getRoleId() { return roleId; }
    public void setRoleId(UUID roleId) { this.roleId = roleId; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getAttendanceStatus() { return attendanceStatus; }
    public void setAttendanceStatus(String attendanceStatus) { this.attendanceStatus = attendanceStatus; }

    public boolean isEodSubmitted() { return eodSubmitted; }
    public void setEodSubmitted(boolean eodSubmitted) { this.eodSubmitted = eodSubmitted; }

    public String getAssignmentStatus() { return assignmentStatus; }
    public void setAssignmentStatus(String assignmentStatus) { this.assignmentStatus = assignmentStatus; }

    public java.time.LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(java.time.LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public UUID getApprovedBy() { return approvedBy; }
    public void setApprovedBy(UUID approvedBy) { this.approvedBy = approvedBy; }

    public java.time.LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(java.time.LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public java.time.LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(java.time.LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public String getCheckinMethod() { return checkinMethod; }
    public void setCheckinMethod(String checkinMethod) { this.checkinMethod = checkinMethod; }

    public Double getCheckinLat() { return checkinLat; }
    public void setCheckinLat(Double checkinLat) { this.checkinLat = checkinLat; }

    public Double getCheckinLng() { return checkinLng; }
    public void setCheckinLng(Double checkinLng) { this.checkinLng = checkinLng; }
}
