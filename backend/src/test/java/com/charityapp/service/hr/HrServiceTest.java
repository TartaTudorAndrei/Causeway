package com.charityapp.service.hr;

import com.charityapp.model.finance.FinanceStand;
import com.charityapp.model.hr.*;
import com.charityapp.service.finance.FinanceService;
import com.charityapp.service.hr.HrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class HrServiceTest {

    private FinanceService financeService;
    private com.charityapp.repository.hr.HrRepository hrRepository;
    private com.charityapp.repository.logistics.StockLocationRepository stockLocationRepository;
    private HrService hrService;

    @BeforeEach
    public void setUp() {
        financeService = Mockito.mock(FinanceService.class);
        hrRepository = Mockito.mock(com.charityapp.repository.hr.HrRepository.class);
        stockLocationRepository = Mockito.mock(com.charityapp.repository.logistics.StockLocationRepository.class);

        Map<UUID, HrMember> membersMap = new ConcurrentHashMap<>();
        Map<UUID, HrStand> standsMap = new ConcurrentHashMap<>();
        Map<UUID, HrStandRole> rolesMap = new ConcurrentHashMap<>();
        Map<UUID, HrShift> shiftsMap = new ConcurrentHashMap<>();
        Map<UUID, HrShiftAssignment> assignmentsMap = new ConcurrentHashMap<>();
        Map<UUID, HrLocation> locationsMap = new ConcurrentHashMap<>();

        when(hrRepository.saveMember(any())).thenAnswer(inv -> {
            HrMember m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            membersMap.put(m.getId(), m);
            return m;
        });
        when(hrRepository.findAllMembers()).thenAnswer(inv -> new ArrayList<>(membersMap.values()));
        when(hrRepository.findMemberById(any())).thenAnswer(inv -> Optional.ofNullable(membersMap.get(inv.getArgument(0))));
        when(hrRepository.findMemberByEmail(any())).thenAnswer(inv -> {
            String email = inv.getArgument(0);
            return membersMap.values().stream().filter(m -> email != null && email.equalsIgnoreCase(m.getEmail())).findFirst();
        });
        Mockito.doAnswer(inv -> {
            membersMap.remove(inv.getArgument(0));
            return null;
        }).when(hrRepository).deleteMember(any());

        when(hrRepository.saveStand(any())).thenAnswer(inv -> {
            HrStand s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            standsMap.put(s.getId(), s);
            if (s.getShifts() != null) {
                for (HrShift sh : s.getShifts()) {
                    if (sh.getId() == null) sh.setId(UUID.randomUUID());
                    sh.setStandId(s.getId());
                    shiftsMap.put(sh.getId(), sh);
                    if (sh.getAssignments() != null) {
                        for (HrShiftAssignment a : sh.getAssignments()) {
                            if (a.getId() == null) a.setId(UUID.randomUUID());
                            a.setShiftId(sh.getId());
                            assignmentsMap.put(a.getId(), a);
                        }
                    }
                }
            }
            return s;
        });
        when(hrRepository.findAllStands()).thenAnswer(inv -> {
            List<HrStand> list = new ArrayList<>();
            for (HrStand s : standsMap.values()) {
                HrStand copy = new HrStand(s.getId(), s.getLocationName(), s.getEventName(), s.getEventDate(), s.getStatus(), s.getNotes());
                copy.setQrCodeToken(s.getQrCodeToken());
                List<HrShift> stShifts = shiftsMap.values().stream().filter(sh -> s.getId().equals(sh.getStandId())).map(sh -> {
                    HrShift shCopy = new HrShift(sh.getId(), sh.getStandId(), sh.getShiftName(), sh.getStartTime(), sh.getEndTime());
                    shCopy.setNeededVolunteers(sh.getNeededVolunteers());
                    shCopy.setNeededLogistics(sh.getNeededLogistics());
                    shCopy.setNeededFinance(sh.getNeededFinance());
                    List<HrShiftAssignment> assigns = assignmentsMap.values().stream().filter(a -> sh.getId().equals(a.getShiftId())).collect(Collectors.toList());
                    shCopy.setAssignments(assigns);
                    return shCopy;
                }).collect(Collectors.toList());
                copy.setShifts(stShifts);
                list.add(copy);
            }
            return list;
        });
        when(hrRepository.findStandById(any())).thenAnswer(inv -> {
            String idStr = inv.getArgument(0);
            HrStand s = standsMap.values().stream().filter(st -> st.getId() != null && (st.getId().toString().equalsIgnoreCase(idStr) || st.getId().toString().startsWith(idStr))).findFirst().orElse(null);
            if (s == null) return null;
            HrStand copy = new HrStand(s.getId(), s.getLocationName(), s.getEventName(), s.getEventDate(), s.getStatus(), s.getNotes());
            copy.setQrCodeToken(s.getQrCodeToken());
            List<HrShift> stShifts = shiftsMap.values().stream().filter(sh -> s.getId().equals(sh.getStandId())).map(sh -> {
                HrShift shCopy = new HrShift(sh.getId(), sh.getStandId(), sh.getShiftName(), sh.getStartTime(), sh.getEndTime());
                shCopy.setNeededVolunteers(sh.getNeededVolunteers());
                shCopy.setNeededLogistics(sh.getNeededLogistics());
                shCopy.setNeededFinance(sh.getNeededFinance());
                List<HrShiftAssignment> assigns = assignmentsMap.values().stream().filter(a -> sh.getId().equals(a.getShiftId())).collect(Collectors.toList());
                shCopy.setAssignments(assigns);
                return shCopy;
            }).collect(Collectors.toList());
            copy.setShifts(stShifts);
            return copy;
        });
        Mockito.doAnswer(inv -> {
            standsMap.remove(inv.getArgument(0));
            return null;
        }).when(hrRepository).deleteStand(any());

        when(hrRepository.saveStandRole(any())).thenAnswer(inv -> {
            HrStandRole r = inv.getArgument(0);
            if (r.getId() == null) r.setId(UUID.randomUUID());
            rolesMap.put(r.getId(), r);
            return r;
        });
        when(hrRepository.findAllStandRoles()).thenAnswer(inv -> new ArrayList<>(rolesMap.values()));

        when(hrRepository.saveShift(any())).thenAnswer(inv -> {
            HrShift sh = inv.getArgument(0);
            if (sh.getId() == null) sh.setId(UUID.randomUUID());
            shiftsMap.put(sh.getId(), sh);
            return sh;
        });
        when(hrRepository.findShiftById(any())).thenAnswer(inv -> Optional.ofNullable(shiftsMap.get(inv.getArgument(0))));
        when(hrRepository.findAllShifts()).thenAnswer(inv -> new ArrayList<>(shiftsMap.values()));
        when(hrRepository.findShiftsByStandId(any())).thenAnswer(inv -> {
            UUID standId = inv.getArgument(0);
            return shiftsMap.values().stream().filter(sh -> standId.equals(sh.getStandId())).collect(Collectors.toList());
        });
        Mockito.doAnswer(inv -> {
            shiftsMap.remove(inv.getArgument(0));
            return null;
        }).when(hrRepository).deleteShift(any());

        when(hrRepository.saveAssignment(any())).thenAnswer(inv -> {
            HrShiftAssignment a = inv.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            assignmentsMap.put(a.getId(), a);
            return a;
        });
        when(hrRepository.findAllAssignments()).thenAnswer(inv -> new ArrayList<>(assignmentsMap.values()));
        when(hrRepository.findAssignmentById(any())).thenAnswer(inv -> Optional.ofNullable(assignmentsMap.get(inv.getArgument(0))));
        when(hrRepository.findAssignmentsByShiftId(any())).thenAnswer(inv -> {
            UUID shiftId = inv.getArgument(0);
            return assignmentsMap.values().stream().filter(a -> shiftId.equals(a.getShiftId())).collect(Collectors.toList());
        });
        Mockito.doAnswer(inv -> {
            assignmentsMap.remove(inv.getArgument(0));
            return null;
        }).when(hrRepository).deleteAssignment(any());
        Mockito.doAnswer(inv -> {
            UUID assignmentId = inv.getArgument(0);
            UUID actorId = inv.getArgument(1);
            HrShiftAssignment a = assignmentsMap.get(assignmentId);
            if (a != null) {
                a.setAssignmentStatus("CONFIRMED");
                a.setExpiresAt(null);
                a.setApprovedBy(actorId);
                a.setApprovedAt(java.time.LocalDateTime.now());
            }
            return null;
        }).when(hrRepository).approveAssignment(any(), any());
        when(hrRepository.cleanExpiredPendingAssignments()).thenAnswer(inv -> {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            assignmentsMap.values().removeIf(a -> "PENDING_APPROVAL".equalsIgnoreCase(a.getAssignmentStatus()) && a.getExpiresAt() != null && a.getExpiresAt().isBefore(now));
            return 1;
        });
        Mockito.doAnswer(inv -> {
            UUID assignmentId = inv.getArgument(0);
            String status = inv.getArgument(1);
            HrShiftAssignment a = assignmentsMap.get(assignmentId);
            if (a != null) a.setAttendanceStatus(status);
            return null;
        }).when(hrRepository).updateAttendance(any(), any());
        Mockito.doAnswer(inv -> {
            UUID assignmentId = inv.getArgument(0);
            boolean sub = inv.getArgument(1);
            HrShiftAssignment a = assignmentsMap.get(assignmentId);
            if (a != null) a.setEodSubmitted(sub);
            return null;
        }).when(hrRepository).updateEoDSubmitted(any(), any(Boolean.class));

        when(hrRepository.saveLocation(any())).thenAnswer(inv -> {
            HrLocation loc = inv.getArgument(0);
            if (loc.getId() == null) loc.setId(UUID.randomUUID());
            locationsMap.put(loc.getId(), loc);
            return loc;
        });
        when(hrRepository.findAllLocations()).thenAnswer(inv -> new ArrayList<>(locationsMap.values()));
        when(hrRepository.findLocationByName(any())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return locationsMap.values().stream().filter(l -> name != null && name.equalsIgnoreCase(l.getName())).findFirst();
        });
        when(hrRepository.countStandsByLocationName(any())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return (int) standsMap.values().stream().filter(s -> name != null && name.equalsIgnoreCase(s.getLocationName())).count();
        });
        Mockito.doAnswer(inv -> {
            locationsMap.remove(inv.getArgument(0));
            return null;
        }).when(hrRepository).deleteLocation(any());

        when(stockLocationRepository.findAll()).thenReturn(Collections.emptyList());
        hrService = new HrService(financeService, hrRepository, stockLocationRepository);
    }

    @Test
    public void testGetStandsAndSeedData() {
        hrService.createStand(new HrStand(null, "Stand Unirii", "Târg", LocalDate.now(), "ACTIVE", "Notes"));
        hrService.createStand(new HrStand(null, "Stand Iulius", "Târg", LocalDate.now(), "PLANNED", "Notes"));
        List<HrStand> stands = hrService.getAllStands();
        assertNotNull(stands);
        assertTrue(stands.size() >= 2);
    }

    @Test
    public void testCreateAndGetMember() {
        HrMember member = new HrMember(null, "Test Volunteer", "test.volunteer@example.org", "+40 700 000 000",
                "Marketing", "Voluntar", "Active", "Weekends", "New recruit");

        HrMember created = hrService.createMember(member);
        assertNotNull(created.getId());
        assertEquals("Test Volunteer", created.getFullName());

        HrMember fetched = hrService.getMemberById(created.getId());
        assertNotNull(fetched);
        assertEquals("test.volunteer@example.org", fetched.getEmail());
    }

    @Test
    public void testCreateStandAndShiftAssignment() {
        HrMember member = hrService.createMember(new HrMember(null, "Voluntar Shift", "volshift@example.org", null, "HR", "Voluntar", "Active", null, null));
        HrStand stand = new HrStand(null, "Test Stand Mall", "Campanie Test", LocalDate.now().plusDays(1), "PLANNED", "Notes");
        HrStand createdStand = hrService.createStand(stand);

        HrShift shift = hrService.addShiftToStand(createdStand.getId(), new HrShift(null, createdStand.getId(), "Shift Test", "10:00", "14:00"));
        assertNotNull(shift.getId());

        List<HrStandRole> roles = hrService.getAllStandRoles();

        HrShiftAssignment assignment = hrService.assignMemberToShift(shift.getId(), member.getId(), roles.get(0).getId());
        assertNotNull(assignment.getId());
        assertEquals("Voluntar Shift", assignment.getMemberName());
    }

    @Test
    public void testCopyStandStructureWithoutVolunteers() {
        HrMember member = hrService.createMember(new HrMember(null, "Voluntar Copy", "volcopy@example.org", null, "HR", "Voluntar", "Active", null, null));
        LocalDate futureDate = LocalDate.now().plusDays(1);
        HrStand stand = new HrStand(null, "Unirii", "Târg", futureDate, "PLANNED", "Sample Notes");
        HrStand createdStand = hrService.createStand(stand);

        HrShift shift = hrService.addShiftToStand(createdStand.getId(), new HrShift(null, createdStand.getId(), "Morning Shift", "08:00", "12:00"));
        HrStandRole role = hrService.getAllStandRoles().get(0);
        hrService.assignMemberToShift(shift.getId(), member.getId(), role.getId());

        HrStand copiedStand = hrService.copyStand(createdStand.getId());
        assertNotNull(copiedStand);
        assertNotEquals(createdStand.getId(), copiedStand.getId());
        assertEquals("Unirii", copiedStand.getLocationName());
        assertEquals(futureDate.plusDays(1), copiedStand.getEventDate());
        assertEquals(1, copiedStand.getShifts().size());
        assertEquals("Morning Shift", copiedStand.getShifts().get(0).getShiftName());
        // Verify no enrolled volunteers (assignments empty)
        assertTrue(copiedStand.getShifts().get(0).getAssignments().isEmpty());

        // Duplicate again when futureDate.plusDays(1) is occupied -> should allocate futureDate.plusDays(2)
        HrStand secondCopy = hrService.copyStand(createdStand.getId());
        assertNotNull(secondCopy);
        assertEquals("Unirii", secondCopy.getLocationName());
        assertEquals(futureDate.plusDays(2), secondCopy.getEventDate());
    }

    @Test
    public void testSubmitEoDFormTriggersFinanceService() {
        HrMember member = hrService.createMember(new HrMember(null, "Voluntar EoD", "voleod@example.org", null, "HR", "Voluntar", "Active", null, null));
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Central", "Event Test", LocalDate.now().plusDays(1), "ACTIVE", "Notes"));
        HrShift shift = hrService.addShiftToStand(stand.getId(), new HrShift(null, stand.getId(), "Shift 1", "08:00", "12:00"));
        HrStandRole role = hrService.getAllStandRoles().get(0);
        HrShiftAssignment assignment = hrService.assignMemberToShift(shift.getId(), member.getId(), role.getId());

        FinanceStand mockReturn = new FinanceStand(stand.getLocationName(), stand.getEventDate(), shift.getShiftName(),
                assignment.getMemberId(), assignment.getMemberName(), new BigDecimal("250.00"), new BigDecimal("100.00"),
                new BigDecimal("50.00"), new BigDecimal("300.00"), BigDecimal.ZERO, null, "SUBMITTED");

        when(financeService.submitStandEoD(any())).thenReturn(mockReturn);

        FinanceStand result = hrService.submitEoDForm(
                assignment.getId(),
                stand.getLocationName(),
                stand.getEventDate(),
                shift.getShiftName(),
                assignment.getMemberName(),
                new BigDecimal("250.00"),
                new BigDecimal("100.00"),
                new BigDecimal("50.00"),
                new BigDecimal("300.00"),
                BigDecimal.ZERO,
                "No discrepancy"
        );

        assertNotNull(result);
        assertEquals(stand.getLocationName(), result.getStandLocation());
    }

    @Test
    public void testGetStats() {
        hrService.createMember(new HrMember(null, "Voluntar Stats", "volstats@example.org", null, "HR", "Voluntar", "Active", null, null));
        hrService.createStand(new HrStand(null, "Stand Stats", "Târg", LocalDate.now().plusDays(1), "ACTIVE", "Notes"));

        HrStats stats = hrService.getStats();
        assertNotNull(stats);
        assertTrue(stats.getShiftCoverageRate() >= 0);
        assertTrue(stats.getTotalVolunteerHoursLogged() >= 0);
        assertTrue(stats.getTotalStandsCount() >= 1);
        assertTrue(stats.getActiveMembersCount() >= 1);
    }

    @Test
    public void testShiftAssignmentGrantsFinanceMemberRole() {
        HrMember member = hrService.createMember(new HrMember(null, "Finance Person", "finperson@example.org", null, "General", "Voluntar", "Active", null, null));
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Finance", "Târg", LocalDate.now().plusDays(1), "ACTIVE", "Notes"));
        HrShift shift = hrService.addShiftToStand(stand.getId(), new HrShift(null, stand.getId(), "Shift 1", "08:00", "12:00"));
        
        // Find Finance Responsible role
        HrStandRole financeRole = hrService.getAllStandRoles().stream()
                .filter(r -> r.getName().equalsIgnoreCase("Finance Responsible"))
                .findFirst().orElseThrow();

        hrService.assignMemberToShift(shift.getId(), member.getId(), financeRole.getId());

        HrMember updatedMember = hrService.getMemberById(member.getId());
        assertNotNull(updatedMember);
        assertEquals("FINANCE_MEMBER", updatedMember.getRole());
        assertEquals("Finance", updatedMember.getDepartment());
    }

    @Test
    public void testShiftAssignmentGrantsLogisticsMemberRole() {
        HrMember member = hrService.createMember(new HrMember(null, "Logistics Person", "logperson@example.org", null, "General", "Voluntar", "Active", null, null));
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Logistics", "Târg", LocalDate.now().plusDays(1), "ACTIVE", "Notes"));
        HrShift shift = hrService.addShiftToStand(stand.getId(), new HrShift(null, stand.getId(), "Shift 1", "08:00", "12:00"));
        
        // Find Logistics Responsible role
        HrStandRole logisticsRole = hrService.getAllStandRoles().stream()
                .filter(r -> r.getName().equalsIgnoreCase("Logistics Responsible"))
                .findFirst().orElseThrow();

        hrService.assignMemberToShift(shift.getId(), member.getId(), logisticsRole.getId());

        HrMember updatedMember = hrService.getMemberById(member.getId());
        assertNotNull(updatedMember);
        assertEquals("LOGISTICS_MEMBER", updatedMember.getRole());
        assertEquals("Logistics", updatedMember.getDepartment());
    }

    @Test
    public void testPublicStandSignupGrantsFinanceRole() {
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Public", "Târg", LocalDate.now().plusDays(1), "ACTIVE", "Notes"));
        HrShift shift = hrService.addShiftToStand(stand.getId(), new HrShift(null, stand.getId(), "Shift 1", "08:00", "12:00"));
        
        HrStandRole financeRole = hrService.getAllStandRoles().stream()
                .filter(r -> r.getName().equalsIgnoreCase("Finance Responsible"))
                .findFirst().orElseThrow();

        var res = hrService.publicHrStandSignup(
                stand.getId().toString(),
                "New Public Volunteer",
                "pubvol@example.org",
                "+40712345678",
                shift.getId(),
                financeRole.getId(),
                "Everyday"
        );

        assertTrue((Boolean) res.get("success"));
        HrMember member = (HrMember) res.get("member");
        assertNotNull(member);
        assertEquals("FINANCE_MEMBER", member.getRole());
        assertEquals("Finance", member.getDepartment());
    }

    @Test
    public void testPreventDoubleSignupOnSameShift() {
        HrMember member = hrService.createMember(new HrMember(null, "Duplicate Volunteer", "dupvol@example.org", null, "HR", "Voluntar", "Active", null, null));
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Double", "Târg", LocalDate.now().plusDays(1), "ACTIVE", "Notes"));
        HrShift shift = hrService.addShiftToStand(stand.getId(), new HrShift(null, stand.getId(), "Shift Morning", "09:00", "13:00"));
        HrStandRole role = hrService.getAllStandRoles().get(0);

        // First assignment succeeds
        HrShiftAssignment first = hrService.assignMemberToShift(shift.getId(), member.getId(), role.getId());
        assertNotNull(first);

        // Second assignment to the same shift throws IllegalStateException
        assertThrows(IllegalStateException.class, () ->
                hrService.assignMemberToShift(shift.getId(), member.getId(), role.getId())
        );
    }

    @Test
    public void testPreventSignupOnExpiredShift() {
        HrMember member = hrService.createMember(new HrMember(null, "Late Volunteer", "latevol@example.org", null, "HR", "Voluntar", "Active", null, null));
        // Stand in the past
        HrStand pastStand = hrService.createStand(new HrStand(null, "Stand Past", "Târg", LocalDate.now().minusDays(2), "COMPLETED", "Notes"));
        HrShift pastShift = hrService.addShiftToStand(pastStand.getId(), new HrShift(null, pastStand.getId(), "Shift Old", "09:00", "13:00"));
        HrStandRole role = hrService.getAllStandRoles().get(0);

        assertThrows(IllegalStateException.class, () ->
                hrService.assignMemberToShift(pastShift.getId(), member.getId(), role.getId())
        );
    }

    @Test
    public void testPublicStandSignupRejectsDuplicateAndExpired() {
        HrStand pastStand = hrService.createStand(new HrStand(null, "Stand Expired", "Târg", LocalDate.now().minusDays(1), "COMPLETED", "Notes"));
        HrShift pastShift = hrService.addShiftToStand(pastStand.getId(), new HrShift(null, pastStand.getId(), "Shift 1", "08:00", "12:00"));
        HrStandRole role = hrService.getAllStandRoles().get(0);

        // Expired signup rejected
        var expiredRes = hrService.publicHrStandSignup(
                pastStand.getId().toString(),
                "New Vol",
                "vol1@example.org",
                "+40711111111",
                pastShift.getId(),
                role.getId(),
                "Anytime"
        );
        assertFalse((Boolean) expiredRes.get("success"));

        // Future stand
        HrStand futureStand = hrService.createStand(new HrStand(null, "Stand Future", "Târg", LocalDate.now().plusDays(2), "ACTIVE", "Notes"));
        HrShift futureShift = hrService.addShiftToStand(futureStand.getId(), new HrShift(null, futureStand.getId(), "Shift Future", "10:00", "14:00"));

        var firstRes = hrService.publicHrStandSignup(
                futureStand.getId().toString(),
                "Valid Vol",
                "vol2@example.org",
                "+40722222222",
                futureShift.getId(),
                role.getId(),
                "Anytime"
        );
        assertTrue((Boolean) firstRes.get("success"));

        // Duplicate signup on same shift rejected
        var dupRes = hrService.publicHrStandSignup(
                futureStand.getId().toString(),
                "Valid Vol",
                "vol2@example.org",
                "+40722222222",
                futureShift.getId(),
                role.getId(),
                "Anytime"
        );
        assertFalse((Boolean) dupRes.get("success"));
    }

    @Test
    public void testLocationCrudAndDeletionGuard() {
        HrLocation loc = hrService.createLocation("Piața Muzeului");
        assertNotNull(loc.getId());
        assertEquals("Piața Muzeului", loc.getName());

        HrLocation updatedLoc = hrService.updateLocation(loc.getId(), "Piața Muzeului - Stand Vechi");
        assertEquals("Piața Muzeului - Stand Vechi", updatedLoc.getName());

        // Create a stand using this location
        HrStand stand = hrService.createStand(new HrStand(null, "Piața Muzeului - Stand Vechi", "Eveniment Local", LocalDate.now().plusDays(5), "PLANNED", "Desc"));

        // Deleting location while stand exists must throw IllegalStateException
        assertThrows(IllegalStateException.class, () -> hrService.deleteLocation(loc.getId()));

        // Delete stand first, then delete location
        hrService.deleteStand(stand.getId());
        assertDoesNotThrow(() -> hrService.deleteLocation(loc.getId()));
    }

    @Test
    public void testShiftRoleCapacitiesAndSignupQuota() {
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Quota Test", "Event Quota", LocalDate.now().plusDays(2), "ACTIVE", "Notes"));
        // Create shift with needed: 1 Volunteer, 1 Logistics, 1 Finance
        HrShift shift = new HrShift(null, stand.getId(), "Shift Quota", "10:00", "14:00", 1, 1, 1);
        HrShift savedShift = hrService.addShiftToStand(stand.getId(), shift);

        assertEquals(1, savedShift.getNeededVolunteers());
        assertEquals(1, savedShift.getNeededLogistics());
        assertEquals(1, savedShift.getNeededFinance());

        List<HrStandRole> roles = hrService.getAllStandRoles();
        HrStandRole financeRole = roles.stream().filter(HrService::isFinanceResponsibleRole).findFirst().orElseThrow();
        HrStandRole volunteerRole = roles.stream().filter(r -> !HrService.isFinanceResponsibleRole(r) && !HrService.isLogisticsResponsibleRole(r)).findFirst().orElseThrow();

        // 1. First finance signup -> should succeed
        Map<String, Object> signup1 = hrService.publicHrStandSignup(
                stand.getId().toString(), "Fin Responsible 1", "fin1@example.org", "+40711111111",
                savedShift.getId(), financeRole.getId(), "Daily"
        );
        assertTrue((Boolean) signup1.get("success"));

        // 2. Second finance signup on same shift (needed = 1, already 1) -> should fail with role quota message
        Map<String, Object> signup2 = hrService.publicHrStandSignup(
                stand.getId().toString(), "Fin Responsible 2", "fin2@example.org", "+40722222222",
                savedShift.getId(), financeRole.getId(), "Daily"
        );
        assertFalse((Boolean) signup2.get("success"));
        assertTrue(signup2.get("message").toString().contains("Coordonator Financiar") || signup2.get("message").toString().contains("ocupate"));

        // 3. First volunteer signup -> should succeed
        Map<String, Object> signupVol1 = hrService.publicHrStandSignup(
                stand.getId().toString(), "Vol 1", "vol1@example.org", "+40733333333",
                savedShift.getId(), volunteerRole.getId(), "Daily"
        );
        assertTrue((Boolean) signupVol1.get("success"));

        // 4. Second volunteer signup on same shift (needed = 1, already 1) -> should fail
        Map<String, Object> signupVol2 = hrService.publicHrStandSignup(
                stand.getId().toString(), "Vol 2", "vol2@example.org", "+40744444444",
                savedShift.getId(), volunteerRole.getId(), "Daily"
        );
        assertFalse((Boolean) signupVol2.get("success"));
        assertTrue(signupVol2.get("message").toString().contains("Voluntar") || signupVol2.get("message").toString().contains("ocupate"));

        // 5. Test copyStand preserves role quotas
        HrStand copied = hrService.copyStand(stand.getId());
        assertNotNull(copied);
        assertEquals(1, copied.getShifts().size());
        HrShift copiedShift = copied.getShifts().get(0);
        assertEquals(1, copiedShift.getNeededVolunteers());
        assertEquals(1, copiedShift.getNeededLogistics());
        assertEquals(1, copiedShift.getNeededFinance());
    }

    @Test
    public void testSlotHoldingAndAutoReleaseOnExpiration() {
        HrMember member = hrService.createMember(new HrMember(null, "Hold Volunteer", "hold@example.org", null, "HR", "Voluntar", "Active", null, null));
        HrStand stand = hrService.createStand(new HrStand(null, "Stand Hold", "Târg", LocalDate.now().plusDays(2), "ACTIVE", "Notes"));
        HrShift shift = hrService.addShiftToStand(stand.getId(), new HrShift(null, stand.getId(), "Shift Hold", "10:00", "14:00"));
        HrStandRole role = hrService.getAllStandRoles().get(0);

        // 1. Hold shift slot
        HrShiftAssignment held = hrService.holdShiftSlot(shift.getId(), member.getId(), role.getId(), stand.getId());
        assertNotNull(held);
        assertEquals("PENDING_APPROVAL", held.getAssignmentStatus());
        assertNotNull(held.getExpiresAt());

        // 2. Approve shift assignment
        UUID adminId = UUID.randomUUID();
        hrService.approveShiftAssignment(held.getId(), adminId);
        assertEquals("CONFIRMED", held.getAssignmentStatus());
        assertNull(held.getExpiresAt());
        assertEquals(adminId, held.getApprovedBy());

        // 3. Create another expired hold
        HrMember member2 = hrService.createMember(new HrMember(null, "Expired Vol", "exp@example.org", null, "HR", "Voluntar", "Active", null, null));
        HrShiftAssignment expiredHeld = hrService.holdShiftSlot(shift.getId(), member2.getId(), role.getId(), stand.getId());
        expiredHeld.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(5));

        // 4. Run cleanup
        hrService.cleanExpiredAssignments();
        assertNull(hrService.getStandById(stand.getId().toString()).getShifts().get(0).getAssignments().stream()
                .filter(a -> a.getId().equals(expiredHeld.getId()))
                .findFirst().orElse(null));
    }
}


