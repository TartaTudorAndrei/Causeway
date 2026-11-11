package com.charityapp.repository.hr;

import com.charityapp.model.hr.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;

@Repository
public class HrRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @jakarta.annotation.PostConstruct
    public void initTables() {
        try {
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS hr;");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS hr.stand_roles (
                    id UUID PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description VARCHAR(255),
                    is_system BOOLEAN NOT NULL DEFAULT FALSE,
                    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS hr.stands (
                    id UUID PRIMARY KEY,
                    location_name VARCHAR(255) NOT NULL,
                    event_name VARCHAR(255) NOT NULL,
                    event_date DATE NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
                    qr_code_token VARCHAR(64),
                    notes TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS hr.shifts (
                    id UUID PRIMARY KEY,
                    stand_id UUID NOT NULL,
                    shift_name VARCHAR(100) NOT NULL,
                    start_time VARCHAR(10) NOT NULL,
                    end_time VARCHAR(10) NOT NULL,
                    needed_volunteers INT NOT NULL DEFAULT 1,
                    needed_logistics INT NOT NULL DEFAULT 1,
                    needed_finance INT NOT NULL DEFAULT 1,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS hr.shift_assignments (
                    id UUID PRIMARY KEY,
                    shift_id UUID NOT NULL,
                    member_id UUID NOT NULL,
                    role_id UUID NOT NULL,
                    attendance_status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
                    assignment_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
                    expires_at TIMESTAMP WITHOUT TIME ZONE,
                    approved_by UUID,
                    approved_at TIMESTAMP WITHOUT TIME ZONE,
                    checked_in_at TIMESTAMP WITHOUT TIME ZONE,
                    checkin_method VARCHAR(50)
                );
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS hr.members (
                    id UUID PRIMARY KEY,
                    full_name VARCHAR(100) NOT NULL,
                    email VARCHAR(150) NOT NULL,
                    phone VARCHAR(50),
                    department VARCHAR(100),
                    role VARCHAR(100),
                    onboarding_status VARCHAR(50) DEFAULT 'ACTIVE',
                    availability VARCHAR(100),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """);
        } catch (Exception ignored) {}
    }

    // --- ROW MAPPERS ---
    private final RowMapper<HrMember> memberRowMapper = (rs, rowNum) -> {
        HrMember m = new HrMember();
        m.setId(UUID.fromString(rs.getString("id")));
        m.setFullName(rs.getString("full_name"));
        m.setEmail(rs.getString("email"));
        m.setPhone(rs.getString("phone"));
        m.setDepartment(rs.getString("department"));
        m.setRole(rs.getString("role"));
        m.setOnboardingStatus(rs.getString("onboarding_status"));
        m.setAvailability(rs.getString("availability"));
        m.setNotes(rs.getString("notes"));
        try {
            String authIdStr = rs.getString("auth_user_id");
            if (authIdStr != null && !authIdStr.isBlank()) {
                m.setAuthUserId(UUID.fromString(authIdStr));
            }
            m.setAuthStatus(rs.getString("auth_status"));
            m.setAuthRole(rs.getString("auth_role"));
            m.setOrganizationType(rs.getString("auth_org_type"));
            m.setOrganizationDetails(rs.getString("auth_org_details"));
        } catch (Exception ignored) {}
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) m.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) m.setUpdatedAt(uat.toLocalDateTime());
        return m;
    };

    private final RowMapper<HrStandRole> roleRowMapper = (rs, rowNum) -> {
        HrStandRole r = new HrStandRole();
        r.setId(UUID.fromString(rs.getString("id")));
        r.setName(rs.getString("name"));
        r.setDescription(rs.getString("description"));
        r.setSystem(rs.getBoolean("is_system"));
        r.setCategory(rs.getString("category"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) r.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) r.setUpdatedAt(uat.toLocalDateTime());
        return r;
    };

    private final RowMapper<HrLocation> locationRowMapper = (rs, rowNum) -> {
        HrLocation loc = new HrLocation();
        loc.setId(UUID.fromString(rs.getString("id")));
        loc.setName(rs.getString("name"));
        try {
            double lat = rs.getDouble("latitude");
            if (!rs.wasNull()) loc.setLatitude(lat);
            double lng = rs.getDouble("longitude");
            if (!rs.wasNull()) loc.setLongitude(lng);
            loc.setAddress(rs.getString("address"));
            loc.setDescription(rs.getString("description"));
        } catch (Exception ignored) {}
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) loc.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) loc.setUpdatedAt(uat.toLocalDateTime());
        return loc;
    };

    private final RowMapper<HrStand> standRowMapper = (rs, rowNum) -> {
        HrStand s = new HrStand();
        s.setId(UUID.fromString(rs.getString("id")));
        s.setLocationName(rs.getString("location_name"));
        s.setEventName(rs.getString("event_name"));
        Date edate = rs.getDate("event_date");
        if (edate != null) s.setEventDate(edate.toLocalDate());
        s.setStatus(rs.getString("status"));
        s.setNotes(rs.getString("notes"));
        try {
            s.setQrCodeToken(rs.getString("qr_code_token"));
        } catch (Exception ignored) {}
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) s.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) s.setUpdatedAt(uat.toLocalDateTime());
        return s;
    };

    private final RowMapper<HrShift> shiftRowMapper = (rs, rowNum) -> {
        HrShift sh = new HrShift();
        sh.setId(UUID.fromString(rs.getString("id")));
        sh.setStandId(UUID.fromString(rs.getString("stand_id")));
        sh.setShiftName(rs.getString("shift_name"));
        sh.setStartTime(rs.getString("start_time"));
        sh.setEndTime(rs.getString("end_time"));
        try {
            sh.setNeededVolunteers(rs.getInt("needed_volunteers"));
            sh.setNeededLogistics(rs.getInt("needed_logistics"));
            sh.setNeededFinance(rs.getInt("needed_finance"));
        } catch (Exception ignored) {}
        return sh;
    };

    private final RowMapper<HrShiftAssignment> assignmentRowMapper = (rs, rowNum) -> {
        HrShiftAssignment sa = new HrShiftAssignment();
        String idStr = rs.getString("id");
        if (idStr != null) sa.setId(UUID.fromString(idStr));
        String shiftIdStr = rs.getString("shift_id");
        if (shiftIdStr != null) sa.setShiftId(UUID.fromString(shiftIdStr));
        String memId = rs.getString("member_id");
        if (memId != null && !memId.isBlank()) sa.setMemberId(UUID.fromString(memId));
        try {
            sa.setMemberName(rs.getString("member_name"));
        } catch (Exception ignored) {}
        try {
            sa.setMemberEmail(rs.getString("member_email"));
        } catch (Exception ignored) {}
        try {
            sa.setMemberPhone(rs.getString("member_phone"));
        } catch (Exception ignored) {}
        try {
            sa.setMemberClub(rs.getString("member_club"));
        } catch (Exception ignored) {}
        String roleIdStr = rs.getString("role_id");
        if (roleIdStr != null && !roleIdStr.isBlank()) sa.setRoleId(UUID.fromString(roleIdStr));
        try {
            sa.setRoleName(rs.getString("role_name"));
        } catch (Exception ignored) {}
        String attStatus = rs.getString("attendance_status");
        sa.setAttendanceStatus((attStatus != null && !attStatus.isBlank() && !"ASSIGNED".equalsIgnoreCase(attStatus)) ? attStatus : "WAITING");
        sa.setEodSubmitted(rs.getBoolean("eod_submitted"));
        try {
            String assignStatus = rs.getString("assignment_status");
            sa.setAssignmentStatus(assignStatus != null ? assignStatus : "CONFIRMED");
            Timestamp exp = rs.getTimestamp("expires_at");
            if (exp != null) sa.setExpiresAt(exp.toLocalDateTime());
            String appBy = rs.getString("approved_by");
            if (appBy != null && !appBy.isBlank()) sa.setApprovedBy(UUID.fromString(appBy));
            Timestamp appAt = rs.getTimestamp("approved_at");
            if (appAt != null) sa.setApprovedAt(appAt.toLocalDateTime());
            Timestamp chkAt = rs.getTimestamp("checked_in_at");
            if (chkAt != null) sa.setCheckedInAt(chkAt.toLocalDateTime());
            sa.setCheckinMethod(rs.getString("checkin_method"));
            double clat = rs.getDouble("checkin_lat");
            if (!rs.wasNull()) sa.setCheckinLat(clat);
            double clng = rs.getDouble("checkin_lng");
            if (!rs.wasNull()) sa.setCheckinLng(clng);
        } catch (Exception ignored) {}
        return sa;
    };

    // --- MEMBERS ---
    public List<HrMember> findAllMembers() {
        String sql = """
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                COALESCE(u.organization_details, 'General') as department,
                u.role,
                CASE 
                    WHEN u.status = 'APPROVED' THEN 'Active'
                    WHEN u.status = 'PENDING_APPROVAL' THEN 'Pending'
                    ELSE 'Inactive'
                END as onboarding_status,
                '' as availability,
                u.notes,
                u.id as auth_user_id,
                u.status as auth_status,
                u.role as auth_role,
                u.organization_type as auth_org_type,
                u.organization_details as auth_org_details,
                u.created_at,
                u.updated_at
            FROM auth.admin_users u
            WHERE u.status != 'REJECTED' AND u.status != 'SUSPENDED'
            ORDER BY u.full_name ASC
            """;
        return jdbcTemplate.query(sql, memberRowMapper);
    }

    public Optional<HrMember> findMemberByEmail(String email) {
        String sql = """
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                COALESCE(u.organization_details, 'General') as department,
                u.role,
                CASE 
                    WHEN u.status = 'APPROVED' THEN 'Active'
                    WHEN u.status = 'PENDING_APPROVAL' THEN 'Pending'
                    ELSE 'Inactive'
                END as onboarding_status,
                '' as availability,
                u.notes,
                u.id as auth_user_id,
                u.status as auth_status,
                u.role as auth_role,
                u.organization_type as auth_org_type,
                u.organization_details as auth_org_details,
                u.created_at,
                u.updated_at
            FROM auth.admin_users u
            WHERE LOWER(u.email) = LOWER(?)
            """;
        List<HrMember> res = jdbcTemplate.query(sql, memberRowMapper, email);
        return res.stream().findFirst();
    }

    public Optional<HrMember> findMemberById(UUID id) {
        String sql = """
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                COALESCE(u.organization_details, 'General') as department,
                u.role,
                CASE 
                    WHEN u.status = 'APPROVED' THEN 'Active'
                    WHEN u.status = 'PENDING_APPROVAL' THEN 'Pending'
                    ELSE 'Inactive'
                END as onboarding_status,
                '' as availability,
                u.notes,
                u.id as auth_user_id,
                u.status as auth_status,
                u.role as auth_role,
                u.organization_type as auth_org_type,
                u.organization_details as auth_org_details,
                u.created_at,
                u.updated_at
            FROM auth.admin_users u
            WHERE u.id = ?
            """;
        List<HrMember> res = jdbcTemplate.query(sql, memberRowMapper, id);
        return res.stream().findFirst();
    }

    public HrMember saveMember(HrMember member) {
        return member;
    }

    public void deleteMember(UUID id) {
    }

    // --- STAND ROLES ---
    public List<HrStandRole> findAllStandRoles() {
        String sql = "SELECT * FROM hr.stand_roles ORDER BY category ASC, name ASC";
        return jdbcTemplate.query(sql, roleRowMapper);
    }

    public HrStandRole saveStandRole(HrStandRole role) {
        if (role.getId() == null) {
            role.setId(UUID.randomUUID());
        }
        int updated = jdbcTemplate.update(
            "UPDATE hr.stand_roles SET name = ?, description = ?, category = ?, is_system = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            role.getName(), role.getDescription(), role.getCategory(), role.isSystem(), role.getId()
        );
        if (updated == 0) {
            jdbcTemplate.update(
                "INSERT INTO hr.stand_roles (id, name, description, is_system, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                role.getId(), role.getName(), role.getDescription(), role.isSystem(), role.getCategory()
            );
        }
        return role;
    }

    public void deleteStandRole(UUID id) {
        jdbcTemplate.update("DELETE FROM hr.stand_roles WHERE id = ? AND is_system = FALSE", id);
    }

    // --- LOCATIONS ---
    public List<HrLocation> findAllLocations() {
        String sql = "SELECT * FROM general.locations WHERE UPPER(type) = 'STAND' ORDER BY name ASC";
        return jdbcTemplate.query(sql, locationRowMapper);
    }

    public HrLocation saveLocation(HrLocation location) {
        if (location.getId() == null) {
            location.setId(UUID.randomUUID());
        }
        String code = "STAND-" + location.getId().toString().substring(0, 8).toUpperCase();
        String sql = """
            INSERT INTO general.locations (id, name, code, type, is_system, created_at, updated_at)
            VALUES (?, ?, ?, 'STAND', FALSE, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            """;
        jdbcTemplate.update(sql, location.getId(), location.getName(), code);
        return location;
    }

    public void updateLocation(UUID id, String oldName, String newName) {
        if (oldName != null && !oldName.equalsIgnoreCase(newName)) {
            jdbcTemplate.update("UPDATE hr.stands SET location_name = ? WHERE LOWER(location_name) = LOWER(?)", newName, oldName);
        }
        jdbcTemplate.update("UPDATE general.locations SET name = ?, updated_at = NOW() WHERE id = ?", newName, id);
    }

    public void deleteLocation(UUID id) {
        jdbcTemplate.update("DELETE FROM general.locations WHERE id = ?", id);
    }

    public int countStandsByLocationName(String locationName) {
        if (locationName == null || locationName.trim().isEmpty()) return 0;
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hr.stands WHERE LOWER(location_name) = LOWER(?)", Integer.class, locationName.trim());
        return count != null ? count : 0;
    }

    // --- STANDS, SHIFTS & ASSIGNMENTS ---
    public List<HrStand> findAllStands() {
        cleanExpiredPendingAssignments();
        autoMarkAbsentForEndedShifts();

        String sql = "SELECT * FROM hr.stands ORDER BY event_date DESC, created_at DESC";
        List<HrStand> stands = jdbcTemplate.query(sql, standRowMapper);
        if (stands.isEmpty()) {
            return stands;
        }

        // Batch load all shifts and assignments in 2 queries to eliminate N+1 latency
        String allShiftsSql = "SELECT * FROM hr.shifts ORDER BY start_time ASC";
        List<HrShift> allShifts = jdbcTemplate.query(allShiftsSql, shiftRowMapper);

        String allAssignmentsSql = """
            SELECT sa.id, sa.shift_id, sa.member_id, u.full_name as member_name, u.email as member_email,
                   u.phone as member_phone,
                   COALESCE(NULLIF(TRIM(u.organization_details), ''), u.organization_type) as member_club,
                   sa.role_id, r.name as role_name, sa.attendance_status, sa.eod_submitted,
                   sa.assignment_status, sa.expires_at, sa.approved_by, sa.approved_at,
                   sa.checked_in_at, sa.checkin_method, sa.checkin_lat, sa.checkin_lng
            FROM hr.shift_assignments sa
            LEFT JOIN auth.admin_users u ON sa.member_id = u.id
            LEFT JOIN hr.stand_roles r ON sa.role_id = r.id
            ORDER BY sa.created_at ASC
            """;
        List<HrShiftAssignment> allAssignments = jdbcTemplate.query(allAssignmentsSql, assignmentRowMapper);

        Map<UUID, List<HrShiftAssignment>> assignmentsByShiftId = new HashMap<>();
        for (HrShiftAssignment sa : allAssignments) {
            if (sa.getShiftId() != null) {
                assignmentsByShiftId.computeIfAbsent(sa.getShiftId(), k -> new ArrayList<>()).add(sa);
            }
        }

        Map<UUID, List<HrShift>> shiftsByStandId = new HashMap<>();
        for (HrShift sh : allShifts) {
            sh.setAssignments(assignmentsByShiftId.getOrDefault(sh.getId(), Collections.emptyList()));
            if (sh.getStandId() != null) {
                shiftsByStandId.computeIfAbsent(sh.getStandId(), k -> new ArrayList<>()).add(sh);
            }
        }

        for (HrStand stand : stands) {
            stand.setShifts(shiftsByStandId.getOrDefault(stand.getId(), Collections.emptyList()));
        }

        return stands;
    }

    public HrStand findStandById(String idStr) {
        if (idStr == null || idStr.trim().isEmpty()) return null;
        String cleanId = idStr.trim().toLowerCase();

        String sql = """
            SELECT * FROM hr.stands 
            WHERE LOWER(id::text) = ? 
               OR LOWER(id::text) LIKE ? 
               OR LOWER(SPLIT_PART(id::text, '-', 1)) = ?
            LIMIT 1
            """;
        List<HrStand> res = jdbcTemplate.query(sql, standRowMapper, cleanId, cleanId + "%", cleanId);
        if (res.isEmpty()) return null;
        HrStand stand = res.get(0);
        populateShifts(stand);
        return stand;
    }

    public HrStand saveStand(HrStand stand) {
        if (stand.getId() == null) {
            stand.setId(UUID.randomUUID());
        }
        LocalDate date = stand.getEventDate() != null ? stand.getEventDate() : LocalDate.now();
        String status = stand.getStatus() != null ? stand.getStatus() : "PLANNED";
        String locationName = stand.getLocationName() != null ? stand.getLocationName() : "";
        String eventName = stand.getEventName() != null ? stand.getEventName() : locationName;
        String qrToken = stand.getQrCodeToken() != null && !stand.getQrCodeToken().isBlank()
                ? stand.getQrCodeToken()
                : UUID.randomUUID().toString().replace("-", "");
        stand.setQrCodeToken(qrToken);

        String sql = """
            INSERT INTO hr.stands (id, location_name, event_name, event_date, status, notes, qr_code_token, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                location_name = EXCLUDED.location_name,
                event_name = EXCLUDED.event_name,
                event_date = EXCLUDED.event_date,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                qr_code_token = COALESCE(hr.stands.qr_code_token, EXCLUDED.qr_code_token),
                updated_at = NOW()
            """;
        jdbcTemplate.update(sql,
            stand.getId(), locationName, eventName,
            Date.valueOf(date), status, stand.getNotes(), qrToken
        );
        return findStandById(stand.getId().toString());
    }

    public void deleteStand(UUID id) {
        jdbcTemplate.update("DELETE FROM hr.stands WHERE id = ?", id);
    }

    public HrShift saveShift(HrShift shift) {
        if (shift.getId() == null) {
            shift.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO hr.shifts (id, stand_id, shift_name, start_time, end_time, needed_volunteers, needed_logistics, needed_finance, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (id) DO UPDATE SET
                shift_name = EXCLUDED.shift_name,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                needed_volunteers = EXCLUDED.needed_volunteers,
                needed_logistics = EXCLUDED.needed_logistics,
                needed_finance = EXCLUDED.needed_finance
            """;
        jdbcTemplate.update(sql,
            shift.getId(), shift.getStandId(), shift.getShiftName(), shift.getStartTime(), shift.getEndTime(),
            shift.getNeededVolunteers(), shift.getNeededLogistics(), shift.getNeededFinance()
        );
        return shift;
    }

    public void deleteShift(UUID shiftId) {
        jdbcTemplate.update("DELETE FROM hr.shifts WHERE id = ?", shiftId);
    }

    public HrShiftAssignment saveAssignment(HrShiftAssignment assignment) {
        if (assignment.getId() == null) {
            assignment.setId(UUID.randomUUID());
        }
        String sql = """
            INSERT INTO hr.shift_assignments (id, shift_id, member_id, role_id, attendance_status, eod_submitted,
                                            assignment_status, expires_at, approved_by, approved_at,
                                            checked_in_at, checkin_method, checkin_lat, checkin_lng, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (id) DO UPDATE SET
                attendance_status = EXCLUDED.attendance_status,
                eod_submitted = EXCLUDED.eod_submitted,
                assignment_status = EXCLUDED.assignment_status,
                expires_at = EXCLUDED.expires_at,
                approved_by = EXCLUDED.approved_by,
                approved_at = EXCLUDED.approved_at,
                checked_in_at = EXCLUDED.checked_in_at,
                checkin_method = EXCLUDED.checkin_method,
                checkin_lat = EXCLUDED.checkin_lat,
                checkin_lng = EXCLUDED.checkin_lng
            """;
        jdbcTemplate.update(sql,
            assignment.getId(), assignment.getShiftId(), assignment.getMemberId(),
            assignment.getRoleId(), assignment.getAttendanceStatus() != null ? assignment.getAttendanceStatus() : "WAITING",
            assignment.isEodSubmitted(),
            assignment.getAssignmentStatus() != null ? assignment.getAssignmentStatus() : "CONFIRMED",
            assignment.getExpiresAt() != null ? Timestamp.valueOf(assignment.getExpiresAt()) : null,
            assignment.getApprovedBy(),
            assignment.getApprovedAt() != null ? Timestamp.valueOf(assignment.getApprovedAt()) : null,
            assignment.getCheckedInAt() != null ? Timestamp.valueOf(assignment.getCheckedInAt()) : null,
            assignment.getCheckinMethod(),
            assignment.getCheckinLat(),
            assignment.getCheckinLng()
        );
        return assignment;
    }

    public void deleteAssignment(UUID assignmentId) {
        jdbcTemplate.update("DELETE FROM hr.shift_assignments WHERE id = ?", assignmentId);
    }

    public void updateAttendance(UUID assignmentId, String status) {
        updateAttendance(assignmentId, status, "MANUAL", null, null);
    }

    public void updateAttendance(UUID assignmentId, String status, String method, Double lat, Double lng) {
        String attStatus = (status != null && !status.isBlank()) ? status.toUpperCase() : "WAITING";
        Timestamp chkAt = ("PRESENT".equals(attStatus) || "LATE".equals(attStatus))
                ? Timestamp.valueOf(java.time.LocalDateTime.now())
                : null;
        String sql = """
            UPDATE hr.shift_assignments
            SET attendance_status = ?,
                checkin_method = ?,
                checked_in_at = CASE WHEN ? IS NOT NULL THEN ? ELSE checked_in_at END,
                checkin_lat = COALESCE(?, checkin_lat),
                checkin_lng = COALESCE(?, checkin_lng)
            WHERE id = ?
            """;
        jdbcTemplate.update(sql, attStatus, method, chkAt, chkAt, lat, lng, assignmentId);
    }

    public void updateEoDSubmitted(UUID assignmentId, boolean submitted) {
        jdbcTemplate.update("UPDATE hr.shift_assignments SET eod_submitted = ?, attendance_status = 'PRESENT' WHERE id = ?", submitted, assignmentId);
    }

    public void approveAssignment(UUID assignmentId, UUID adminActorId) {
        String sql = """
            UPDATE hr.shift_assignments
            SET assignment_status = 'CONFIRMED', expires_at = NULL, approved_by = ?, approved_at = NOW()
            WHERE id = ?
            """;
        jdbcTemplate.update(sql, adminActorId, assignmentId);
    }

    public void approveAssignmentsForUser(UUID userId, UUID adminActorId) {
        String sql = """
            UPDATE hr.shift_assignments
            SET assignment_status = 'CONFIRMED', expires_at = NULL, approved_by = ?, approved_at = NOW()
            WHERE member_id = ? AND assignment_status = 'PENDING_APPROVAL'
            """;
        jdbcTemplate.update(sql, adminActorId, userId);
    }

    public void deleteAssignmentsForUser(UUID userId) {
        String sql = "DELETE FROM hr.shift_assignments WHERE member_id = ? AND assignment_status = 'PENDING_APPROVAL'";
        jdbcTemplate.update(sql, userId);
    }

    public int cleanExpiredPendingAssignments() {
        String sql = "DELETE FROM hr.shift_assignments WHERE assignment_status = 'PENDING_APPROVAL' AND expires_at < NOW()";
        return jdbcTemplate.update(sql);
    }

    public int autoMarkAbsentForEndedShifts() {
        String sql = """
            UPDATE hr.shift_assignments sa
            SET attendance_status = 'ABSENT'
            FROM hr.shifts sh
            JOIN hr.stands st ON sh.stand_id = st.id
            WHERE sa.shift_id = sh.id
              AND sa.attendance_status = 'WAITING'
              AND (
                  st.event_date < CURRENT_DATE
                  OR (
                      st.event_date = CURRENT_DATE
                      AND NULLIF(TRIM(sh.end_time), '') IS NOT NULL
                      AND CASE 
                          WHEN LENGTH(TRIM(sh.end_time)) = 4 AND SUBSTRING(TRIM(sh.end_time), 2, 1) = ':' THEN ('0' || TRIM(sh.end_time))::time
                          ELSE TRIM(sh.end_time)::time
                      END < CURRENT_TIME
                  )
              )
            """;
        try {
            return jdbcTemplate.update(sql);
        } catch (Exception e) {
            return 0;
        }
    }

    public HrStand findStandByQrToken(String qrToken) {
        if (qrToken == null || qrToken.trim().isEmpty()) return null;
        String cleanToken = qrToken.trim().toLowerCase();
        String sql = """
            SELECT * FROM hr.stands 
            WHERE LOWER(qr_code_token) = ? 
               OR LOWER(id::text) = ?
               OR LOWER(SPLIT_PART(id::text, '-', 1)) = ?
            LIMIT 1
            """;
        List<HrStand> res = jdbcTemplate.query(sql, standRowMapper, cleanToken, cleanToken, cleanToken);
        if (res.isEmpty()) return null;
        HrStand stand = res.get(0);
        populateShifts(stand);
        return stand;
    }

    public Optional<HrLocation> findLocationByName(String name) {
        if (name == null || name.trim().isEmpty()) return Optional.empty();
        String sql = "SELECT * FROM general.locations WHERE LOWER(name) = LOWER(?) LIMIT 1";
        List<HrLocation> res = jdbcTemplate.query(sql, locationRowMapper, name.trim());
        return res.stream().findFirst();
    }

    // Helper to load nested shifts and shift assignments
    private void populateShifts(HrStand stand) {
        cleanExpiredPendingAssignments();
        autoMarkAbsentForEndedShifts();
        String shiftSql = "SELECT * FROM hr.shifts WHERE stand_id = ? ORDER BY start_time ASC";
        List<HrShift> shifts = jdbcTemplate.query(shiftSql, shiftRowMapper, stand.getId());
        
        for (HrShift sh : shifts) {
            String assignSql = """
                SELECT sa.id, sa.shift_id, sa.member_id, u.full_name as member_name, u.email as member_email,
                       u.phone as member_phone,
                       COALESCE(NULLIF(TRIM(u.organization_details), ''), u.organization_type) as member_club,
                       sa.role_id, r.name as role_name, sa.attendance_status, sa.eod_submitted,
                       sa.assignment_status, sa.expires_at, sa.approved_by, sa.approved_at,
                       sa.checked_in_at, sa.checkin_method, sa.checkin_lat, sa.checkin_lng
                FROM hr.shift_assignments sa
                LEFT JOIN auth.admin_users u ON sa.member_id = u.id
                LEFT JOIN hr.stand_roles r ON sa.role_id = r.id
                WHERE sa.shift_id = ?
                ORDER BY sa.created_at ASC
                """;
            List<HrShiftAssignment> assignments = jdbcTemplate.query(assignSql, assignmentRowMapper, sh.getId());
            sh.setAssignments(assignments);
        }
        stand.setShifts(shifts);
    }
    public Optional<HrShift> findShiftById(UUID shiftId) {
        String sql = "SELECT * FROM hr.shifts WHERE id = ?";
        List<HrShift> list = jdbcTemplate.query(sql, shiftRowMapper, shiftId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    // --- FEEDBACK CATEGORIES & VOLUNTEER FEEDBACK ROW MAPPERS ---
    private final RowMapper<HrFeedbackCategory> feedbackCategoryRowMapper = (rs, rowNum) -> {
        HrFeedbackCategory c = new HrFeedbackCategory();
        c.setId(UUID.fromString(rs.getString("id")));
        c.setName(rs.getString("name"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) c.setCreatedAt(cat.toLocalDateTime());
        return c;
    };

    private final RowMapper<VolunteerFeedback> volunteerFeedbackRowMapper = (rs, rowNum) -> {
        VolunteerFeedback f = new VolunteerFeedback();
        f.setId(UUID.fromString(rs.getString("id")));
        String uid = rs.getString("user_id");
        if (uid != null && !uid.isBlank()) f.setUserId(UUID.fromString(uid));
        f.setSubmitterName(rs.getString("submitter_name"));
        f.setSubmitterEmail(rs.getString("submitter_email"));
        String cid = rs.getString("category_id");
        if (cid != null && !cid.isBlank()) f.setCategoryId(UUID.fromString(cid));
        try {
            f.setCategoryName(rs.getString("category_name"));
        } catch (Exception ignored) {}
        f.setType(rs.getString("type"));
        f.setIsAnonymous(rs.getBoolean("is_anonymous"));
        f.setIsPublicSubmission(rs.getBoolean("is_public_submission"));
        f.setTargetType(rs.getString("target_type"));
        f.setTargetId(rs.getString("target_id"));
        f.setContent(rs.getString("content"));
        f.setStatus(rs.getString("status"));
        f.setInternalNotes(rs.getString("internal_notes"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) f.setCreatedAt(cat.toLocalDateTime());
        Timestamp resAt = rs.getTimestamp("resolved_at");
        if (resAt != null) f.setResolvedAt(resAt.toLocalDateTime());
        String resBy = rs.getString("resolved_by");
        if (resBy != null && !resBy.isBlank()) f.setResolvedBy(UUID.fromString(resBy));
        try {
            f.setResolverName(rs.getString("resolver_name"));
        } catch (Exception ignored) {}
        return f;
    };

    // --- FEEDBACK CATEGORIES CRUD ---
    public List<HrFeedbackCategory> findAllFeedbackCategories() {
        return jdbcTemplate.query("SELECT * FROM hr.feedback_categories ORDER BY name ASC", feedbackCategoryRowMapper);
    }

    public Optional<HrFeedbackCategory> findFeedbackCategoryById(UUID id) {
        List<HrFeedbackCategory> list = jdbcTemplate.query("SELECT * FROM hr.feedback_categories WHERE id = ?", feedbackCategoryRowMapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<HrFeedbackCategory> findFeedbackCategoryByName(String name) {
        List<HrFeedbackCategory> list = jdbcTemplate.query("SELECT * FROM hr.feedback_categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))", feedbackCategoryRowMapper, name);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public HrFeedbackCategory createFeedbackCategory(String name) {
        UUID id = UUID.randomUUID();
        String sql = "INSERT INTO hr.feedback_categories (id, name, created_at) VALUES (?, ?, NOW())";
        jdbcTemplate.update(sql, id, name.trim());
        return findFeedbackCategoryById(id).orElseThrow();
    }

    public HrFeedbackCategory updateFeedbackCategory(UUID id, String name) {
        String sql = "UPDATE hr.feedback_categories SET name = ? WHERE id = ?";
        jdbcTemplate.update(sql, name.trim(), id);
        return findFeedbackCategoryById(id).orElse(null);
    }

    public void deleteFeedbackCategory(UUID id) {
        jdbcTemplate.update("DELETE FROM hr.feedback_categories WHERE id = ?", id);
    }

    // --- VOLUNTEER FEEDBACK CRUD ---
    public VolunteerFeedback saveVolunteerFeedback(VolunteerFeedback feedback) {
        if (feedback.getId() == null) feedback.setId(UUID.randomUUID());
        String sql = """
            INSERT INTO hr.volunteer_feedback (
                id, user_id, submitter_name, submitter_email, category_id,
                type, is_anonymous, is_public_submission, target_type, target_id,
                content, status, internal_notes, created_at, resolved_at, resolved_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
            """;
        jdbcTemplate.update(sql,
                feedback.getId(),
                feedback.getUserId(),
                feedback.getSubmitterName(),
                feedback.getSubmitterEmail(),
                feedback.getCategoryId(),
                feedback.getType() != null ? feedback.getType().toUpperCase() : "COMPLAINT",
                feedback.getIsAnonymous() != null ? feedback.getIsAnonymous() : true,
                feedback.getIsPublicSubmission() != null ? feedback.getIsPublicSubmission() : false,
                feedback.getTargetType() != null ? feedback.getTargetType().toUpperCase() : "GENERAL",
                feedback.getTargetId(),
                feedback.getContent(),
                feedback.getStatus() != null ? feedback.getStatus().toUpperCase() : "NEW",
                feedback.getInternalNotes(),
                feedback.getResolvedAt() != null ? Timestamp.valueOf(feedback.getResolvedAt()) : null,
                feedback.getResolvedBy()
        );
        return findVolunteerFeedbackById(feedback.getId()).orElse(feedback);
    }

    public Optional<VolunteerFeedback> findVolunteerFeedbackById(UUID id) {
        String sql = """
            SELECT vf.*, fc.name as category_name, u.full_name as resolver_name
            FROM hr.volunteer_feedback vf
            LEFT JOIN hr.feedback_categories fc ON vf.category_id = fc.id
            LEFT JOIN auth.admin_users u ON vf.resolved_by = u.id
            WHERE vf.id = ?
            """;
        List<VolunteerFeedback> list = jdbcTemplate.query(sql, volunteerFeedbackRowMapper, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<VolunteerFeedback> findVolunteerFeedback(
            String status,
            String type,
            UUID categoryId,
            Boolean isAnonymous,
            Boolean isPublicSubmission,
            String searchQuery,
            LocalDate startDate,
            LocalDate endDate
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT vf.*, fc.name as category_name, u.full_name as resolver_name
            FROM hr.volunteer_feedback vf
            LEFT JOIN hr.feedback_categories fc ON vf.category_id = fc.id
            LEFT JOIN auth.admin_users u ON vf.resolved_by = u.id
            WHERE 1=1
            """);
        List<Object> params = new ArrayList<>();

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            sql.append(" AND UPPER(vf.status) = ?");
            params.add(status.trim().toUpperCase());
        }
        if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
            sql.append(" AND UPPER(vf.type) = ?");
            params.add(type.trim().toUpperCase());
        }
        if (categoryId != null) {
            sql.append(" AND vf.category_id = ?");
            params.add(categoryId);
        }
        if (isAnonymous != null) {
            sql.append(" AND vf.is_anonymous = ?");
            params.add(isAnonymous);
        }
        if (isPublicSubmission != null) {
            sql.append(" AND vf.is_public_submission = ?");
            params.add(isPublicSubmission);
        }
        if (startDate != null) {
            sql.append(" AND DATE(vf.created_at) >= ?");
            params.add(Date.valueOf(startDate));
        }
        if (endDate != null) {
            sql.append(" AND DATE(vf.created_at) <= ?");
            params.add(Date.valueOf(endDate));
        }
        if (searchQuery != null && !searchQuery.isBlank()) {
            String q = "%" + searchQuery.trim().toLowerCase() + "%";
            sql.append(" AND (LOWER(vf.content) LIKE ? OR LOWER(COALESCE(vf.submitter_name, '')) LIKE ? OR LOWER(COALESCE(vf.internal_notes, '')) LIKE ?)");
            params.add(q);
            params.add(q);
            params.add(q);
        }

        sql.append(" ORDER BY vf.created_at DESC");
        return jdbcTemplate.query(sql.toString(), volunteerFeedbackRowMapper, params.toArray());
    }

    public void updateVolunteerFeedback(UUID id, String status, UUID categoryId, String internalNotes, UUID resolverId) {
        String sql;
        if ("RESOLVED".equalsIgnoreCase(status) || "ARCHIVED".equalsIgnoreCase(status)) {
            sql = """
                UPDATE hr.volunteer_feedback
                SET status = COALESCE(?, status),
                    category_id = COALESCE(?, category_id),
                    internal_notes = COALESCE(?, internal_notes),
                    resolved_at = NOW(),
                    resolved_by = COALESCE(?, resolved_by)
                WHERE id = ?
                """;
            jdbcTemplate.update(sql, status != null ? status.toUpperCase() : null, categoryId, internalNotes, resolverId, id);
        } else {
            sql = """
                UPDATE hr.volunteer_feedback
                SET status = COALESCE(?, status),
                    category_id = COALESCE(?, category_id),
                    internal_notes = COALESCE(?, internal_notes)
                WHERE id = ?
                """;
            jdbcTemplate.update(sql, status != null ? status.toUpperCase() : null, categoryId, internalNotes, id);
        }
    }

    public void deleteVolunteerFeedback(UUID id) {
        jdbcTemplate.update("DELETE FROM hr.volunteer_feedback WHERE id = ?", id);
    }

    public List<HrShift> findAllShifts() {
        return jdbcTemplate.query("SELECT * FROM hr.shifts ORDER BY start_time", shiftRowMapper);
    }

    public Optional<HrShiftAssignment> findAssignmentById(UUID assignmentId) {
        String sql = """
            SELECT sa.id, sa.shift_id, sa.member_id, u.full_name as member_name, u.email as member_email,
                   u.phone as member_phone,
                   COALESCE(NULLIF(TRIM(u.organization_details), ''), u.organization_type) as member_club,
                   sa.role_id, r.name as role_name, sa.attendance_status, sa.eod_submitted,
                   sa.assignment_status, sa.expires_at, sa.approved_by, sa.approved_at,
                   sa.checked_in_at, sa.checkin_method, sa.checkin_lat, sa.checkin_lng
            FROM hr.shift_assignments sa
            LEFT JOIN auth.admin_users u ON sa.member_id = u.id
            LEFT JOIN hr.stand_roles r ON sa.role_id = r.id
            WHERE sa.id = ?
            """;
        List<HrShiftAssignment> list = jdbcTemplate.query(sql, assignmentRowMapper, assignmentId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<HrShiftAssignment> findAllAssignments() {
        String sql = """
            SELECT sa.id, sa.shift_id, sa.member_id, u.full_name as member_name, u.email as member_email,
                   u.phone as member_phone,
                   COALESCE(NULLIF(TRIM(u.organization_details), ''), u.organization_type) as member_club,
                   sa.role_id, r.name as role_name, sa.attendance_status, sa.eod_submitted,
                   sa.assignment_status, sa.expires_at, sa.approved_by, sa.approved_at,
                   sa.checked_in_at, sa.checkin_method, sa.checkin_lat, sa.checkin_lng
            FROM hr.shift_assignments sa
            LEFT JOIN auth.admin_users u ON sa.member_id = u.id
            LEFT JOIN hr.stand_roles r ON sa.role_id = r.id
            ORDER BY sa.created_at ASC
            """;
        return jdbcTemplate.query(sql, assignmentRowMapper);
    }

    public List<HrShiftAssignment> findAssignmentsByShiftId(UUID shiftId) {
        String sql = """
            SELECT sa.id, sa.shift_id, sa.member_id, u.full_name as member_name, u.email as member_email,
                   u.phone as member_phone,
                   COALESCE(NULLIF(TRIM(u.organization_details), ''), u.organization_type) as member_club,
                   sa.role_id, r.name as role_name, sa.attendance_status, sa.eod_submitted,
                   sa.assignment_status, sa.expires_at, sa.approved_by, sa.approved_at,
                   sa.checked_in_at, sa.checkin_method, sa.checkin_lat, sa.checkin_lng
            FROM hr.shift_assignments sa
            LEFT JOIN auth.admin_users u ON sa.member_id = u.id
            LEFT JOIN hr.stand_roles r ON sa.role_id = r.id
            WHERE sa.shift_id = ?
            ORDER BY sa.created_at ASC
            """;
        return jdbcTemplate.query(sql, assignmentRowMapper, shiftId);
    }

    public List<HrShift> findShiftsByStandId(UUID standId) {
        return jdbcTemplate.query("SELECT * FROM hr.shifts WHERE stand_id = ? ORDER BY start_time", shiftRowMapper, standId);
    }

    public boolean isUserAuthorizedForStandOperation(UUID userId, UUID standId, String requiredRoleCategory) {
        if (userId == null || standId == null) return false;
        String sql = """
            SELECT COUNT(*) 
            FROM hr.shift_assignments sa
            JOIN hr.shifts sh ON sa.shift_id = sh.id
            JOIN hr.stands st ON sh.stand_id = st.id
            JOIN hr.stand_roles sr ON sa.role_id = sr.id
            WHERE sa.member_id = ?
              AND st.id = ?
              AND UPPER(sr.category) = UPPER(?)
              AND sa.assignment_status = 'CONFIRMED'
              AND st.event_date = CURRENT_DATE
              AND (CURRENT_TIME >= (
                  CASE 
                      WHEN LENGTH(TRIM(sh.start_time)) = 4 AND SUBSTRING(TRIM(sh.start_time), 2, 1) = ':' THEN ('0' || TRIM(sh.start_time))::time
                      ELSE TRIM(sh.start_time)::time
                  END - INTERVAL '30 minutes'
              ))
              AND (CURRENT_TIME <= (
                  CASE 
                      WHEN LENGTH(TRIM(sh.end_time)) = 4 AND SUBSTRING(TRIM(sh.end_time), 2, 1) = ':' THEN ('0' || TRIM(sh.end_time))::time
                      ELSE TRIM(sh.end_time)::time
                  END + INTERVAL '60 minutes'
              ))
              AND sa.eod_submitted = FALSE
            """;
        try {
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId, standId, requiredRoleCategory);
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }
}

