package com.charityapp.service.hr;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminStatus;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.finance.FinanceStand;
import com.charityapp.model.hr.*;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.hr.HrRepository;
import com.charityapp.service.finance.FinanceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
public class HrService {

    private static final Logger log = LoggerFactory.getLogger(HrService.class);

    private final FinanceService financeService;
    private final HrRepository hrRepository;
    private final AdminUserRepository adminUserRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final com.charityapp.repository.general.GeneralRepository generalRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private GeminiFeedbackAnalysisService geminiFeedbackAnalysisService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.auth.AdminAuthService adminAuthService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.security.PasswordHasher passwordHasher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.notification.WhatsAppNotificationService whatsAppNotificationService;

    public HrService(FinanceService financeService, HrRepository hrRepository) {
        this(financeService, hrRepository, null, null, null);
    }

    public HrService(FinanceService financeService, HrRepository hrRepository,
                     @org.springframework.context.annotation.Lazy com.charityapp.repository.logistics.StockLocationRepository stockLocationRepository) {
        this(financeService, hrRepository, null, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public HrService(FinanceService financeService, HrRepository hrRepository,
                     @org.springframework.context.annotation.Lazy AdminUserRepository adminUserRepository,
                     @org.springframework.context.annotation.Lazy org.springframework.context.ApplicationEventPublisher eventPublisher,
                     @org.springframework.context.annotation.Lazy com.charityapp.repository.general.GeneralRepository generalRepository) {
        this.financeService = financeService;
        this.hrRepository = hrRepository;
        this.adminUserRepository = adminUserRepository;
        this.eventPublisher = eventPublisher;
        this.generalRepository = generalRepository;
        initSeedData();
    }

    private void initSeedData() {
        try {
            List<HrStandRole> existing = hrRepository.findAllStandRoles();
            Map<UUID, HrStandRole> existingById = new HashMap<>();
            for (HrStandRole r : existing) existingById.put(r.getId(), r);
            
            List<HrStandRole> systemRoles = List.of(
                new HrStandRole(UUID.fromString("10000000-0000-0000-0000-000000000001"), "Finance Responsible", "Responsabil cu încasările, casa de marcat și formularul EoD", true, "FINANCE"),
                new HrStandRole(UUID.fromString("10000000-0000-0000-0000-000000000003"), "Logistics Responsible", "Responsabil cu stocul de mărfuri și echipamentul tehnic", true, "LOGISTICS"),
                new HrStandRole(UUID.fromString("10000000-0000-0000-0000-000000000005"), "Volunteer", "Voluntar general pentru informare și promovare", true, "GENERAL")
            );
            for (HrStandRole role : systemRoles) {
                if (!existingById.containsKey(role.getId())) {
                    hrRepository.saveStandRole(role);
                }
            }
        } catch (Exception e) {
            log.warn("Could not seed system stand roles: {}", e.getMessage());
        }
    }

    // --- MEMBERS DIRECTORY ---
    public List<HrMember> getAllMembers() {
        try {
            return hrRepository.findAllMembers();
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public HrMember getMemberById(UUID id) {
        return getAllMembers().stream().filter(m -> m.getId().equals(id)).findFirst().orElse(null);
    }

    private void publishHrChange(String action) {
        if (eventPublisher != null) {
            try {
                eventPublisher.publishEvent(new com.charityapp.event.DashboardDataChangedEvent("HR", action));
            } catch (Exception ignored) {}
        }
    }

    public HrMember createMember(HrMember member) {
        if (member.getId() == null) {
            member.setId(UUID.randomUUID());
        }
        HrMember res;
        try {
            HrMember saved = hrRepository.saveMember(member);
            res = saved;
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("createMember");
        return res;
    }

    public void updateMember(UUID id, HrMember updated) {
        updated.setId(id);
        try {
            hrRepository.saveMember(updated);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("updateMember");
    }

    public void deleteMember(UUID id) {
        try {
            hrRepository.deleteMember(id);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("deleteMember");
    }

    // --- STAND ROLES ---
    public List<HrStandRole> getAllStandRoles() {
        try {
            List<HrStandRole> list = hrRepository.findAllStandRoles();
            if (list.isEmpty()) {
                initSeedData();
                list = hrRepository.findAllStandRoles();
            }
            return list;
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public HrStandRole createStandRole(HrStandRole role) {
        if (role.getId() == null) {
            role.setId(UUID.randomUUID());
        }
        try {
            HrStandRole saved = hrRepository.saveStandRole(role);
            return saved;
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public void updateStandRole(UUID id, HrStandRole updated) {
        updated.setId(id);
        try {
            hrRepository.saveStandRole(updated);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public static boolean isVolunteerRole(HrStandRole role) {
        if (role == null) return false;
        String n = (role.getName() != null ? role.getName() : "").trim().toLowerCase();
        return n.contains("volunteer") || n.contains("voluntar");
    }

    public static boolean isCoreStandRole(HrStandRole role) {
        if (role == null) return false;
        return role.isSystem() || isFinanceResponsibleRole(role) || isLogisticsResponsibleRole(role) || isVolunteerRole(role);
    }

    public void deleteStandRole(UUID id) {
        HrStandRole role = getAllStandRoles().stream().filter(r -> r.getId().equals(id)).findFirst().orElse(null);
        if (role != null && isCoreStandRole(role)) {
            throw new IllegalStateException("Rolurile de bază (Coordonator Financiar, Coordonator Logistică, Voluntar) nu pot fi șterse.");
        }
        try {
            hrRepository.deleteStandRole(id);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    // --- LOCATIONS ---
    public List<HrLocation> getAllLocations() {
        try {
            List<HrLocation> list = hrRepository.findAllLocations();
            list.sort(Comparator.comparing(HrLocation::getName));
            return list;
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public HrLocation getLocationById(UUID id) {
        return getAllLocations().stream().filter(l -> l.getId().equals(id)).findFirst().orElse(null);
    }

    public HrLocation createLocation(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Location name cannot be empty");
        }
        String cleanName = name.trim();
        List<HrLocation> existing = getAllLocations();
        Optional<HrLocation> found = existing.stream().filter(l -> l.getName().equalsIgnoreCase(cleanName)).findFirst();
        if (found.isPresent()) {
            return found.get();
        }

        HrLocation loc = new HrLocation(UUID.randomUUID(), cleanName);
        try {
            hrRepository.saveLocation(loc);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        return loc;
    }

    public HrLocation updateLocation(UUID id, String newName) {
        if (newName == null || newName.trim().isEmpty()) {
            throw new IllegalArgumentException("Location name cannot be empty");
        }
        String cleanName = newName.trim();
        HrLocation loc = getLocationById(id);
        if (loc != null) {
            String oldName = loc.getName();
            loc.setName(cleanName);
            loc.setUpdatedAt(java.time.LocalDateTime.now());

            try {
                hrRepository.updateLocation(id, oldName, cleanName);
            } catch (Exception e) {
                throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
            }
            return loc;
        }
        return null;
    }

    public void deleteLocation(UUID id) {
        HrLocation loc = getLocationById(id);
        if (loc == null) return;

        List<String> usageReasons = new ArrayList<>();

        // 1. Check general repository usage reasons (Logistics stock, transfers, adjustments, HR stands)
        if (generalRepository != null) {
            try {
                usageReasons.addAll(generalRepository.getLocationUsageReasons(id, loc.getName()));
            } catch (Exception e) {
                throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
            }
        } else {
            // Fallback DB stand check
            int dbCount = 0;
            try {
                dbCount = hrRepository.countStandsByLocationName(loc.getName());
            } catch (Exception ignored) {}
            if (dbCount > 0) {
                usageReasons.add("este atribuită la " + dbCount + " stand(uri) HR");
            }
        }

        if (!usageReasons.isEmpty()) {
            throw new IllegalStateException("Nu se poate șterge locația '" + loc.getName() + "': " + String.join(", ", usageReasons) + ".");
        }

        try {
            hrRepository.deleteLocation(id);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public HrStand getStandById(String idStr) {
        if (idStr == null || idStr.trim().isEmpty()) return null;
        try {
            HrStand dbStand = hrRepository.findStandById(idStr);
            if (dbStand != null) return dbStand;
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }

        return null;
    }

    public HrStand getStandById(UUID id) {
        if (id == null) return null;
        return getStandById(id.toString());
    }

    public List<HrStand> getAllStands() {
        try {
            return hrRepository.findAllStands();
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public HrStand createStand(HrStand stand) {
        if (stand.getId() == null) {
            stand.setId(UUID.randomUUID());
        }
        if (stand.getLocationName() != null && !stand.getLocationName().trim().isEmpty()) {
            try {
                createLocation(stand.getLocationName().trim());
            } catch (Exception ignored) {}
        }
        HrStand res;
        try {
            HrStand saved = hrRepository.saveStand(stand);
            if (stand.getShifts() != null && !stand.getShifts().isEmpty()) {
                for (HrShift shift : stand.getShifts()) {
                    shift.setStandId(saved.getId());
                    try {
                        hrRepository.saveShift(shift);
                    } catch (Exception ignored) {}
                }
            }
            res = getStandById(saved.getId());
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("createStand");
        return res != null ? res : stand;
    }

    public void updateStand(UUID id, HrStand updated) {
        updated.setId(id);
        if (updated.getLocationName() != null && !updated.getLocationName().trim().isEmpty()) {
            try {
                createLocation(updated.getLocationName().trim());
            } catch (Exception ignored) {}
        }
        try {
            hrRepository.saveStand(updated);
            if (updated.getShifts() != null && !updated.getShifts().isEmpty()) {
                for (HrShift shift : updated.getShifts()) {
                    shift.setStandId(id);
                    try {
                        hrRepository.saveShift(shift);
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("updateStand");
    }

    public void deleteStand(UUID id) {
        try {
            hrRepository.deleteStand(id);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("deleteStand");
    }

    public HrStand copyStand(UUID sourceStandId) {
        HrStand source = getStandById(sourceStandId);
        if (source == null) {
            throw new IllegalArgumentException("Stand not found: " + sourceStandId);
        }

        List<HrStand> allStands = getAllStands();
        LocalDate nextDate = findNextAvailableDate(source.getLocationName(), source.getEventDate(), allStands);

        String initialStatus = "COMPLETED".equalsIgnoreCase(source.getStatus()) ? "PLANNED" : source.getStatus();
        if (initialStatus == null || initialStatus.isBlank()) {
            initialStatus = "PLANNED";
        }

        HrStand newStand = new HrStand(
                UUID.randomUUID(),
                source.getLocationName(),
                source.getEventName(),
                nextDate,
                initialStatus,
                source.getNotes()
        );

        createStand(newStand);

        if (source.getShifts() != null) {
            for (HrShift sh : source.getShifts()) {
                HrShift newShift = new HrShift(
                        UUID.randomUUID(),
                        newStand.getId(),
                        sh.getShiftName(),
                        sh.getStartTime(),
                        sh.getEndTime(),
                        sh.getNeededVolunteers(),
                        sh.getNeededLogistics(),
                        sh.getNeededFinance()
                );
                addShiftToStand(newStand.getId(), newShift);
            }
        }
        return getStandById(newStand.getId());
    }

    public static LocalDate findNextAvailableDate(String locationName, LocalDate sourceDate, List<HrStand> allStands) {
        LocalDate candidate = (sourceDate != null) ? sourceDate.plusDays(1) : LocalDate.now().plusDays(1);
        if (locationName == null) {
            return candidate;
        }
        String cleanLocation = locationName.trim();

        while (isLocationOccupiedOnDate(cleanLocation, candidate, allStands)) {
            candidate = candidate.plusDays(1);
        }
        return candidate;
    }

    private static boolean isLocationOccupiedOnDate(String locationName, LocalDate date, List<HrStand> allStands) {
        if (allStands == null || date == null) return false;
        return allStands.stream()
                .anyMatch(s -> s.getLocationName() != null
                        && s.getLocationName().trim().equalsIgnoreCase(locationName)
                        && date.equals(s.getEventDate()));
    }

    public HrShift addShiftToStand(UUID standId, HrShift shift) {
        if (shift.getId() == null) {
            shift.setId(UUID.randomUUID());
        }
        shift.setStandId(standId);
        try {
            hrRepository.saveShift(shift);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        return shift;
    }

    public HrShift updateShift(UUID shiftId, HrShift updated) {
        HrShift existing = hrRepository.findShiftById(shiftId).orElse(null);
        if (existing != null) {
            if (updated.getShiftName() != null) existing.setShiftName(updated.getShiftName());
            if (updated.getStartTime() != null) existing.setStartTime(updated.getStartTime());
            if (updated.getEndTime() != null) existing.setEndTime(updated.getEndTime());
            existing.setNeededVolunteers(updated.getNeededVolunteers());
            existing.setNeededLogistics(updated.getNeededLogistics());
            existing.setNeededFinance(updated.getNeededFinance());
            try {
                hrRepository.saveShift(existing);
            } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
            return existing;
        } else {
            updated.setId(shiftId);
            try {
                hrRepository.saveShift(updated);
            } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
            return updated;
        }
    }

    public void deleteShift(UUID shiftId) {
        try {
            hrRepository.deleteShift(shiftId);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public boolean isShiftExpired(LocalDate eventDate, String endTime) {
        if (eventDate == null) return false;
        LocalDate today = LocalDate.now();
        if (eventDate.isBefore(today)) {
            return true;
        }
        if (eventDate.isEqual(today) && endTime != null && !endTime.isBlank()) {
            try {
                String trimmed = endTime.trim();
                if (trimmed.length() == 4 && trimmed.charAt(1) == ':') {
                    trimmed = "0" + trimmed;
                }
                LocalTime time = LocalTime.parse(trimmed);
                if (LocalTime.now().isAfter(time)) {
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    public boolean isStandExpired(HrStand stand) {
        if (stand == null || stand.getEventDate() == null) return false;
        LocalDate today = LocalDate.now();
        if (stand.getEventDate().isBefore(today)) return true;
        if (stand.getEventDate().isEqual(today)) {
            if (stand.getShifts() == null || stand.getShifts().isEmpty()) return false;
            LocalTime latestEndTime = null;
            for (HrShift sh : stand.getShifts()) {
                if (sh.getEndTime() != null && !sh.getEndTime().isBlank()) {
                    try {
                        String t = sh.getEndTime().trim();
                        if (t.length() == 4 && t.charAt(1) == ':') t = "0" + t;
                        LocalTime parsed = LocalTime.parse(t);
                        if (latestEndTime == null || parsed.isAfter(latestEndTime)) {
                            latestEndTime = parsed;
                        }
                    } catch (Exception ignored) {}
                }
            }
            if (latestEndTime != null && LocalTime.now().isAfter(latestEndTime)) {
                return true;
            }
        }
        return false;
    }

    public HrShiftAssignment assignMemberToShift(UUID shiftId, UUID memberId, UUID roleId) {
        HrMember member = getMemberById(memberId);
        HrStandRole role = getAllStandRoles().stream().filter(r -> r.getId().equals(roleId)).findFirst().orElse(null);

        if (member == null || role == null) {
            throw new IllegalArgumentException("Invalid memberId or roleId");
        }

        // 1. Find parent stand & shift to check if expired
        HrShift shift = hrRepository.findShiftById(shiftId).orElse(null);
        HrStand parentStand = null;
        if (shift != null && shift.getStandId() != null) {
            parentStand = hrRepository.findStandById(shift.getStandId().toString());
        }
        if (parentStand == null) {
            for (HrStand s : getAllStands()) {
                if (s.getShifts() != null) {
                    for (HrShift sh : s.getShifts()) {
                        if (shiftId.equals(sh.getId())) {
                            shift = sh;
                            parentStand = s;
                            break;
                        }
                    }
                }
                if (parentStand != null) break;
            }
        }

        if (parentStand != null && shift != null && isShiftExpired(parentStand.getEventDate(), shift.getEndTime())) {
            throw new IllegalStateException("Acest schimb s-a încheiat deja și nu mai acceptă înscrieri.");
        }

        // 2. Prevent duplicate signup / double-booking on the same shift
        boolean alreadyAssigned = hrRepository.findAllAssignments().stream()
                .anyMatch(a -> shiftId.equals(a.getShiftId()) && (
                        memberId.equals(a.getMemberId()) ||
                        (member.getEmail() != null && member.getEmail().equalsIgnoreCase(a.getMemberEmail()))
                ));
        if (!alreadyAssigned && shift != null && shift.getAssignments() != null) {
            alreadyAssigned = shift.getAssignments().stream()
                    .anyMatch(a -> memberId.equals(a.getMemberId()) ||
                            (member.getEmail() != null && member.getEmail().equalsIgnoreCase(a.getMemberEmail())));
        }
        if (alreadyAssigned) {
            throw new IllegalStateException("Voluntarul este deja înscris pe acest schimb.");
        }

        HrShiftAssignment assignment = new HrShiftAssignment(
                UUID.randomUUID(),
                shiftId,
                memberId,
                member.getFullName(),
                member.getEmail(),
                roleId,
                role.getName(),
                "WAITING"
        );
        if (member != null) {
            assignment.setMemberPhone(member.getPhone());
            String club = (member.getOrganizationDetails() != null && !member.getOrganizationDetails().isBlank())
                    ? member.getOrganizationDetails() : member.getOrganizationType();
            assignment.setMemberClub(club);
        }
        try {
            hrRepository.saveMember(member);
            hrRepository.saveAssignment(assignment);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }

        // Immediately grant department member role if assigning to Finance/Logistics Responsible
        grantDepartmentRoleIfResponsible(member, role);
        publishHrChange("assignMember");

        return assignment;
    }

    public void grantDepartmentRoleIfResponsible(HrMember member, HrStandRole role) {
        if (member == null || role == null) return;

        AdminRole targetAdminRole = null;
        String targetDepartment = null;

        if (isFinanceResponsibleRole(role)) {
            targetAdminRole = AdminRole.FINANCE_MEMBER;
            targetDepartment = "Finance";
        } else if (isLogisticsResponsibleRole(role)) {
            targetAdminRole = AdminRole.LOGISTICS_MEMBER;
            targetDepartment = "Logistics";
        }

        if (targetAdminRole == null) return;

        // 1. Update HrMember in repository & memory
        boolean memberUpdated = false;
        if (member.getRole() == null || "Voluntar".equalsIgnoreCase(member.getRole()) || "VOLUNTEER".equalsIgnoreCase(member.getRole())) {
            member.setRole(targetAdminRole.name());
            memberUpdated = true;
        }
        if (member.getDepartment() == null || "Resurse Umane".equalsIgnoreCase(member.getDepartment()) || "General".equalsIgnoreCase(member.getDepartment())) {
            member.setDepartment(targetDepartment);
            memberUpdated = true;
        }

        if (memberUpdated) {
            try {
                hrRepository.saveMember(member);
            } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        }

        // 2. Update or create AdminUser in auth.admin_users
        if (adminUserRepository != null && member.getEmail() != null && !member.getEmail().isBlank()) {
            try {
                Optional<AdminUser> userOpt = adminUserRepository.findByEmail(member.getEmail().trim());
                if (userOpt.isPresent()) {
                    AdminUser user = userOpt.get();
                    List<String> rolesList = user.getRoles() != null ? new ArrayList<>(user.getRoles()) : new ArrayList<>();
                    if (!rolesList.contains(targetAdminRole.name())) {
                        rolesList.add(targetAdminRole.name());
                    }
                    String primaryRole = user.getRole();
                    if (primaryRole == null || "VOLUNTEER".equalsIgnoreCase(primaryRole)) {
                        primaryRole = targetAdminRole.name();
                    }
                    user.setRole(primaryRole);
                    user.setRoles(rolesList);
                    adminUserRepository.updateRoles(user.getId(), primaryRole, rolesList);
                    log.info("Granted role {} to user {}", targetAdminRole, user.getEmail());
                } else {
                    String passwordHash = passwordHasher != null ? passwordHasher.hash("Charity2026Volun!") : "Charity2026Volun!";
                    AdminUser newUser = new AdminUser(
                            member.getFullName(),
                            member.getEmail().trim(),
                            passwordHash,
                            AdminStatus.APPROVED,
                            new ArrayList<>(List.of(targetAdminRole.name(), "VOLUNTEER"))
                    );
                    newUser.setRole(targetAdminRole.name());
                    newUser.setPhone(member.getPhone());
                    newUser.setOrganizationType("Volunteer / Stand Responsible");
                    newUser.setNotes("Auto-created and granted " + targetAdminRole.name() + " upon shift assignment");
                    adminUserRepository.save(newUser);
                    log.info("Created new user {} with role {}", newUser.getEmail(), targetAdminRole);
                }
            } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        }
    }

    public static boolean isFinanceResponsibleRole(HrStandRole role) {
        if (role == null) return false;
        String cat = role.getCategory() != null ? role.getCategory().trim().toUpperCase() : "";
        return "FINANCE".equals(cat);
    }

    public static boolean isFinanceRoleName(String name) {
        if (name == null) return false;
        String n = name.trim().toLowerCase();
        return n.contains("finance") || n.contains("financiar") || n.contains("finanțe") || n.contains("finante");
    }

    public static boolean isLogisticsResponsibleRole(HrStandRole role) {
        if (role == null) return false;
        String cat = role.getCategory() != null ? role.getCategory().trim().toUpperCase() : "";
        return "LOGISTICS".equals(cat);
    }

    public static boolean isLogisticsRoleName(String name) {
        if (name == null) return false;
        String n = name.trim().toLowerCase();
        return n.contains("logistic") || n.contains("logistica") || n.contains("logistică");
    }

    public void removeAssignment(UUID assignmentId) {
        HrShiftAssignment assignment = hrRepository.findAssignmentById(assignmentId).orElse(null);
        UUID shiftId = assignment != null ? assignment.getShiftId() : null;

        try {
            hrRepository.deleteAssignment(assignmentId);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }

        if (shiftId != null) {
            checkAndAlertLowVolunteerCapacity(shiftId);
        }
    }

    public void checkAndAlertLowVolunteerCapacity(UUID shiftId) {
        if (whatsAppNotificationService == null || shiftId == null) return;
        try {
            for (HrStand stand : getAllStands()) {
                if (stand.getShifts() != null) {
                    for (HrShift shift : stand.getShifts()) {
                        if (shiftId.equals(shift.getId())) {
                            LocalDate eventDate = stand.getEventDate();
                            if (eventDate != null && (eventDate.isEqual(LocalDate.now()) || eventDate.isEqual(LocalDate.now().plusDays(1)))) {
                                int required = shift.getNeededVolunteers() + shift.getNeededLogistics() + shift.getNeededFinance();
                                int confirmed = (int) (shift.getAssignments() != null ? shift.getAssignments().stream()
                                        .filter(a -> "CONFIRMED".equalsIgnoreCase(a.getAssignmentStatus()) || "ASSIGNED".equalsIgnoreCase(a.getAssignmentStatus()))
                                        .count() : 0);
                                if (confirmed < required) {
                                    whatsAppNotificationService.sendHrLowVolunteerCapacityAlert(
                                            shift.getShiftName(),
                                            eventDate.toString(),
                                            shift.getStartTime(),
                                            shift.getEndTime(),
                                            confirmed,
                                            required,
                                            stand.getLocationName()
                                    );
                                }
                            }
                            return;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
    }


    public void updateAttendance(UUID assignmentId, String attendanceStatus) {
        String status = (attendanceStatus != null && !attendanceStatus.isBlank()) ? attendanceStatus.toUpperCase() : "WAITING";
        try {
            hrRepository.updateAttendance(assignmentId, status);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        HrShiftAssignment assignment = hrRepository.findAssignmentById(assignmentId).orElse(null);
        if (assignment != null) {
            assignment.setAttendanceStatus(status);
            if ("PRESENT".equalsIgnoreCase(status) || "LATE".equalsIgnoreCase(status)) {
                if (assignment.getCheckedInAt() == null) {
                    assignment.setCheckedInAt(java.time.LocalDateTime.now());
                }
                if (assignment.getCheckinMethod() == null) {
                    assignment.setCheckinMethod("MANUAL");
                }
            }
        }
        publishHrChange("updateAttendance");
    }

    public int autoMarkAbsentForEndedShifts() {
        try {
            int marked = hrRepository.autoMarkAbsentForEndedShifts();
            for (HrStand stand : hrRepository.findAllStands()) {
                if (stand.getShifts() != null) {
                    for (HrShift sh : stand.getShifts()) {
                        if (isShiftExpired(stand.getEventDate(), sh.getEndTime())) {
                            for (HrShiftAssignment a : hrRepository.findAllAssignments()) {
                                if (sh.getId().equals(a.getShiftId()) && "WAITING".equalsIgnoreCase(a.getAttendanceStatus())) {
                                    a.setAttendanceStatus("ABSENT");
                                }
                            }
                        }
                    }
                }
            }
            return marked;
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
    }

    public static double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Radius of earth in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public Map<String, Object> recordGpsAttendance(UUID userId, String userEmail, UUID standId, UUID shiftId, Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Coordonatele GPS lipsesc.");
        }

        autoMarkAbsentForEndedShifts();

        // 1. Find volunteer assignment on stand/shift
        HrShiftAssignment targetAssignment = null;
        HrStand targetStand = null;
        HrShift targetShift = null;

        List<HrStand> allStands = getAllStands();
        for (HrStand s : allStands) {
            if (standId != null && !s.getId().equals(standId)) continue;
            if (s.getShifts() != null) {
                for (HrShift sh : s.getShifts()) {
                    if (shiftId != null && !sh.getId().equals(shiftId)) continue;
                    if (sh.getAssignments() != null) {
                        for (HrShiftAssignment a : sh.getAssignments()) {
                            boolean matchesUser = (userId != null && userId.equals(a.getMemberId()))
                                    || (userEmail != null && userEmail.equalsIgnoreCase(a.getMemberEmail()));
                            if (matchesUser) {
                                targetAssignment = a;
                                targetStand = s;
                                targetShift = sh;
                                break;
                            }
                        }
                    }
                    if (targetAssignment != null) break;
                }
            }
            if (targetAssignment != null) break;
        }

        if (targetAssignment == null || targetStand == null || targetShift == null) {
            return Map.of(
                    "success", false,
                    "message", "Nu ești înscris pe niciun schimb pentru acest stand."
            );
        }

        if (isShiftExpired(targetStand.getEventDate(), targetShift.getEndTime())) {
            return Map.of(
                    "success", false,
                    "message", "Schimbul s-a încheiat deja."
            );
        }

        // 2. Validate coordinates with Stand Location defined in map / general.locations
        Double standLat = null;
        Double standLng = null;

        if (targetStand.getLocationName() != null) {
            try {
                Optional<HrLocation> locOpt = hrRepository.findLocationByName(targetStand.getLocationName());
                if (locOpt.isPresent()) {
                    standLat = locOpt.get().getLatitude();
                    standLng = locOpt.get().getLongitude();
                }
            } catch (Exception ignored) {}
            if (standLat == null) {
                for (HrLocation loc : hrRepository.findAllLocations()) {
                    if (loc.getName() != null && loc.getName().equalsIgnoreCase(targetStand.getLocationName())) {
                        standLat = loc.getLatitude();
                        standLng = loc.getLongitude();
                        break;
                    }
                }
            }
        }

        double maxAllowedDistanceMeters = 300.0; // 300 meters margin of error for urban/indoor GPS
        double distanceMeters = 0.0;

        if (standLat != null && standLng != null) {
            distanceMeters = calculateDistanceMeters(latitude, longitude, standLat, standLng);
            if (distanceMeters > maxAllowedDistanceMeters) {
                String distStr = distanceMeters >= 1000.0
                        ? String.format(Locale.ROOT, "%.1f km", distanceMeters / 1000.0)
                        : String.format(Locale.ROOT, "%d m", (int) Math.round(distanceMeters));
                return Map.of(
                        "success", false,
                        "distanceMeters", (int) Math.round(distanceMeters),
                        "message", "Ești la aproximativ " + distStr + " de stand. Te rugăm să fii în perimetrul standului (" + targetStand.getLocationName() + ") pentru a confirma prezența."
                );
            }
        }

        // 3. Mark Present
        String newStatus = "PRESENT";
        try {
            hrRepository.updateAttendance(targetAssignment.getId(), newStatus, "GPS", latitude, longitude);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }

        targetAssignment.setAttendanceStatus(newStatus);
        targetAssignment.setCheckedInAt(java.time.LocalDateTime.now());
        targetAssignment.setCheckinMethod("GPS");
        targetAssignment.setCheckinLat(latitude);
        targetAssignment.setCheckinLng(longitude);

        publishHrChange("recordGpsAttendance");

        return Map.of(
                "success", true,
                "attendanceStatus", newStatus,
                "standName", targetStand.getLocationName(),
                "shiftName", targetShift.getShiftName(),
                "memberName", targetAssignment.getMemberName() != null ? targetAssignment.getMemberName() : "",
                "message", "Prezența a fost confirmată cu succes prin GPS la " + targetStand.getLocationName() + "!"
        );
    }

    public Map<String, Object> recordQrAttendance(UUID userId, String userEmail, String qrToken, UUID standId, UUID shiftId) {
        if (qrToken == null || qrToken.isBlank()) {
            throw new IllegalArgumentException("Codul QR lipsește.");
        }

        autoMarkAbsentForEndedShifts();

        HrStand stand = null;
        try {
            stand = hrRepository.findStandByQrToken(qrToken);
        } catch (Exception ignored) {}
        if (stand == null && standId != null) {
            stand = getStandById(standId.toString());
        }
        if (stand == null) {
            String cleanToken = qrToken.trim().toLowerCase();
            for (HrStand s : hrRepository.findAllStands()) {
                if (s.getQrCodeToken() != null && s.getQrCodeToken().equalsIgnoreCase(cleanToken)) {
                    stand = s;
                    break;
                }
                if (s.getId().toString().equalsIgnoreCase(cleanToken) || s.getId().toString().startsWith(cleanToken)) {
                    stand = s;
                    break;
                }
            }
        }

        if (stand == null) {
            return Map.of(
                    "success", false,
                    "message", "Codul QR este invalid sau standul nu a fost găsit."
            );
        }

        // Find user assignment on this stand
        HrShiftAssignment targetAssignment = null;
        HrShift targetShift = null;

        if (stand.getShifts() != null) {
            for (HrShift sh : stand.getShifts()) {
                if (shiftId != null && !sh.getId().equals(shiftId)) continue;
                if (sh.getAssignments() != null) {
                    for (HrShiftAssignment a : sh.getAssignments()) {
                        boolean matchesUser = (userId != null && userId.equals(a.getMemberId()))
                                || (userEmail != null && userEmail.equalsIgnoreCase(a.getMemberEmail()));
                        if (matchesUser) {
                            targetAssignment = a;
                            targetShift = sh;
                            break;
                        }
                    }
                }
                if (targetAssignment != null) break;
            }
        }

        if (targetAssignment == null || targetShift == null) {
            return Map.of(
                    "success", false,
                    "message", "Nu ești înscris ca voluntar pe schimburile standului " + stand.getLocationName() + "."
            );
        }

        if (isShiftExpired(stand.getEventDate(), targetShift.getEndTime())) {
            return Map.of(
                    "success", false,
                    "message", "Schimbul (" + targetShift.getShiftName() + ") s-a încheiat deja."
            );
        }

        // Mark Present
        String newStatus = "PRESENT";
        try {
            hrRepository.updateAttendance(targetAssignment.getId(), newStatus, "QR", null, null);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }

        targetAssignment.setAttendanceStatus(newStatus);
        targetAssignment.setCheckedInAt(java.time.LocalDateTime.now());
        targetAssignment.setCheckinMethod("QR");

        publishHrChange("recordQrAttendance");

        return Map.of(
                "success", true,
                "attendanceStatus", newStatus,
                "standName", stand.getLocationName(),
                "shiftName", targetShift.getShiftName(),
                "memberName", targetAssignment.getMemberName() != null ? targetAssignment.getMemberName() : "",
                "message", "Prezența a fost confirmată cu succes prin scanarea codului QR!"
        );
    }

    public Map<String, Object> getStandQrCodeInfo(UUID standId) {
        HrStand stand = getStandById(standId.toString());
        if (stand == null) {
            throw new IllegalArgumentException("Standul nu a fost găsit.");
        }
        String qrToken = stand.getQrCodeToken();
        if (qrToken == null || qrToken.isBlank()) {
            qrToken = UUID.randomUUID().toString().replace("-", "");
            stand.setQrCodeToken(qrToken);
            try {
                hrRepository.saveStand(stand);
            } catch (Exception ignored) {}
        }
        return Map.of(
                "standId", stand.getId().toString(),
                "locationName", stand.getLocationName() != null ? stand.getLocationName() : "",
                "eventName", stand.getEventName() != null ? stand.getEventName() : "",
                "eventDate", stand.getEventDate() != null ? stand.getEventDate().toString() : "",
                "qrToken", qrToken
        );
    }

    public void approveShiftAssignment(UUID assignmentId, UUID actorId) {
        try {
            hrRepository.approveAssignment(assignmentId, actorId);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        HrShiftAssignment assignment = hrRepository.findAssignmentById(assignmentId).orElse(null);
        if (assignment != null) {
            assignment.setAssignmentStatus("CONFIRMED");
            assignment.setExpiresAt(null);
            assignment.setApprovedBy(actorId);
            assignment.setApprovedAt(java.time.LocalDateTime.now());
        }
        publishHrChange("approveShiftAssignment");
    }

    public void rejectShiftAssignment(UUID assignmentId) {
        removeAssignment(assignmentId);
        publishHrChange("rejectShiftAssignment");
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void cleanExpiredAssignments() {
        try {
            hrRepository.cleanExpiredPendingAssignments();
        } catch (Exception ignored) {}
    }

    public boolean hasShiftCapacity(HrShift shift, UUID roleId) {
        if (shift == null) return false;
        HrStandRole requestedRole = getAllStandRoles().stream().filter(r -> r.getId().equals(roleId)).findFirst().orElse(null);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<HrShiftAssignment> activeAssignments = (shift.getAssignments() != null ? shift.getAssignments() : Collections.<HrShiftAssignment>emptyList())
                .stream()
                .filter(a -> "CONFIRMED".equalsIgnoreCase(a.getAssignmentStatus()) ||
                        ("PENDING_APPROVAL".equalsIgnoreCase(a.getAssignmentStatus()) && (a.getExpiresAt() == null || a.getExpiresAt().isAfter(now))))
                .toList();

        if (isFinanceResponsibleRole(requestedRole)) {
            long financeCount = activeAssignments.stream().filter(a -> {
                HrStandRole r = getAllStandRoles().stream().filter(role -> role.getId().equals(a.getRoleId())).findFirst().orElse(null);
                return isFinanceResponsibleRole(r);
            }).count();
            return financeCount < shift.getNeededFinance();
        } else if (isLogisticsResponsibleRole(requestedRole)) {
            long logCount = activeAssignments.stream().filter(a -> {
                HrStandRole r = getAllStandRoles().stream().filter(role -> role.getId().equals(a.getRoleId())).findFirst().orElse(null);
                return isLogisticsResponsibleRole(r);
            }).count();
            return logCount < shift.getNeededLogistics();
        } else {
            long volCount = activeAssignments.stream().filter(a -> {
                HrStandRole r = getAllStandRoles().stream().filter(role -> role.getId().equals(a.getRoleId())).findFirst().orElse(null);
                return !isFinanceResponsibleRole(r) && !isLogisticsResponsibleRole(r);
            }).count();
            return volCount < shift.getNeededVolunteers();
        }
    }

    public HrShiftAssignment holdShiftSlot(UUID shiftId, UUID userId, UUID roleId, UUID standId) {
        cleanExpiredAssignments();
        HrStand stand = standId != null ? getStandById(standId.toString()) : null;
        HrShift shift = hrRepository.findShiftById(shiftId).orElse(null);
        if (shift == null && stand != null && stand.getShifts() != null) {
            shift = stand.getShifts().stream().filter(s -> s.getId().equals(shiftId)).findFirst().orElse(null);
        }

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime expiresAt = now.plusHours(24);
        if (stand != null && shift != null && stand.getEventDate() != null && shift.getStartTime() != null) {
            try {
                LocalDate eventDate = stand.getEventDate();
                LocalTime startTime = LocalTime.parse(shift.getStartTime());
                java.time.LocalDateTime shiftStart = java.time.LocalDateTime.of(eventDate, startTime);
                if (shiftStart.isBefore(expiresAt) && shiftStart.isAfter(now)) {
                    expiresAt = shiftStart;
                }
            } catch (Exception ignored) {}
        }

        HrMember member = getMemberById(userId);
        String memberName = member != null ? member.getFullName() : "Voluntar";
        String memberEmail = member != null ? member.getEmail() : "";
        HrStandRole role = getAllStandRoles().stream().filter(r -> r.getId().equals(roleId)).findFirst().orElse(null);
        String roleName = role != null ? role.getName() : "Volunteer";

        HrShiftAssignment assignment = new HrShiftAssignment(
                UUID.randomUUID(),
                shiftId,
                userId,
                memberName,
                memberEmail,
                roleId,
                roleName,
                "ASSIGNED",
                "PENDING_APPROVAL",
                expiresAt
        );
        if (member != null) {
            assignment.setMemberPhone(member.getPhone());
            String club = (member.getOrganizationDetails() != null && !member.getOrganizationDetails().isBlank())
                    ? member.getOrganizationDetails() : member.getOrganizationType();
            assignment.setMemberClub(club);
        }

        try {
            if (member != null) hrRepository.saveMember(member);
            hrRepository.saveAssignment(assignment);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        publishHrChange("holdShiftSlot");
        return assignment;
    }

    public Map<String, Object> activatePendingHold(UUID userId, UUID shiftId, UUID roleId, UUID standId) {
        cleanExpiredAssignments();
        HrStand stand = standId != null ? getStandById(standId.toString()) : null;
        HrShift shift = hrRepository.findShiftById(shiftId).orElse(null);
        if (shift == null && stand != null && stand.getShifts() != null) {
            shift = stand.getShifts().stream().filter(s -> s.getId().equals(shiftId)).findFirst().orElse(null);
        }

        if (stand != null && isStandExpired(stand)) {
            return Map.of("success", false, "message", "Standul a expirat.");
        }
        if (stand != null && shift != null && isShiftExpired(stand.getEventDate(), shift.getEndTime())) {
            return Map.of("success", false, "message", "Schimbul a expirat.");
        }

        HrMember member = getMemberById(userId);
        final String email = member != null ? member.getEmail() : null;
        boolean alreadyAssigned = hrRepository.findAllAssignments().stream()
                .anyMatch(a -> shiftId.equals(a.getShiftId()) && (userId.equals(a.getMemberId()) || (email != null && email.equalsIgnoreCase(a.getMemberEmail()))));
        if (alreadyAssigned) {
            return Map.of("success", true, "message", "Ești deja înscris pe acest schimb.");
        }

        if (shift != null && !hasShiftCapacity(shift, roleId)) {
            return Map.of("success", false, "message", "Locurile pentru acest rol pe schimb au fost deja ocupate.");
        }

        HrShiftAssignment heldAssignment = holdShiftSlot(shiftId, userId, roleId, standId);
        return Map.of("success", true, "assignment", heldAssignment);
    }

    public FinanceStand submitEoDForm(UUID assignmentId, String locationName, LocalDate eventDate, String shiftName,
                                     String financeResponsibleName, BigDecimal cashCollected, BigDecimal posCardCollected,
                                     BigDecimal openingBalance, BigDecimal closingBalance, BigDecimal discrepancyAmount,
                                     String discrepancyNotes) {
        
        try {
            hrRepository.updateEoDSubmitted(assignmentId, true);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }

        HrShiftAssignment assignment = hrRepository.findAssignmentById(assignmentId).orElse(null);
        if (assignment != null) {
            assignment.setEodSubmitted(true);
            assignment.setAttendanceStatus("ATTENDED");
        }

        FinanceStand financeStand = new FinanceStand(
                locationName,
                eventDate != null ? eventDate : LocalDate.now(),
                shiftName,
                assignment != null ? assignment.getMemberId() : UUID.randomUUID(),
                financeResponsibleName,
                cashCollected != null ? cashCollected : BigDecimal.ZERO,
                posCardCollected != null ? posCardCollected : BigDecimal.ZERO,
                openingBalance != null ? openingBalance : BigDecimal.ZERO,
                closingBalance != null ? closingBalance : BigDecimal.ZERO,
                discrepancyAmount != null ? discrepancyAmount : BigDecimal.ZERO,
                discrepancyNotes,
                "SUBMITTED"
        );

        return financeService.submitStandEoD(financeStand);
    }

    public void deleteEoD(UUID assignmentId) {
        try {
            hrRepository.updateEoDSubmitted(assignmentId, false);
        } catch (Exception e) {
            throw new RuntimeException("HR data operation failed: " + e.getMessage(), e);
        }
        HrShiftAssignment assignment = hrRepository.findAssignmentById(assignmentId).orElse(null);
        if (assignment != null) {
            assignment.setEodSubmitted(false);
        }
    }

    // --- STATISTICS ---
    public HrStats getStats() {
        List<HrStand> standList = getAllStands();
        List<HrMember> memberList = getAllMembers();

        int totalStands = standList.size();
        int totalMembers = memberList.size();
        long activeMembers = memberList.stream().filter(m -> "Active".equalsIgnoreCase(m.getOnboardingStatus())).count();

        Map<String, Integer> attendanceByStandMap = new HashMap<>();
        Map<String, Integer> roleDistMap = new HashMap<>();
        Map<String, Integer> onboardingMap = new HashMap<>();

        double coverageRate = 0;
        int totalNeeded = 0;
        int totalAssigned = 0;

        for (HrStand stand : standList) {
            int standAssigned = 0;
            if (stand.getShifts() != null) {
                for (HrShift sh : stand.getShifts()) {
                    totalNeeded += sh.getNeededVolunteers() + sh.getNeededLogistics() + sh.getNeededFinance();
                    if (sh.getAssignments() != null) {
                        for (HrShiftAssignment a : sh.getAssignments()) {
                            totalAssigned++;
                            standAssigned++;
                            if (a.getRoleName() != null) {
                                roleDistMap.put(a.getRoleName(), roleDistMap.getOrDefault(a.getRoleName(), 0) + 1);
                            }
                        }
                    }
                }
            }
            attendanceByStandMap.put(stand.getLocationName() != null ? stand.getLocationName() : "Stand", standAssigned);
        }

        if (totalNeeded > 0) {
            coverageRate = Math.min(100.0, ((double) totalAssigned / totalNeeded) * 100.0);
        }

        int volunteerHours = totalAssigned * 4;

        for (HrMember m : memberList) {
            onboardingMap.put(m.getOnboardingStatus(), onboardingMap.getOrDefault(m.getOnboardingStatus(), 0) + 1);
        }

        return new HrStats(coverageRate, volunteerHours, totalStands, totalMembers, (int)activeMembers,
                attendanceByStandMap, roleDistMap, onboardingMap);
    }

    // --- PUBLIC STAND SIGNUP ---
    public Map<String, Object> publicHrStandSignup(String standIdStr, String fullName, String email, String phone,
                                                  UUID shiftId, UUID roleId, String availability) {
        return publicHrStandSignup(standIdStr, fullName, email, null, phone, "Volunteer", "Community Chapter",
                shiftId, roleId, availability, "127.0.0.1", "Test-Agent", "http://localhost:5173");
    }

    public Map<String, Object> publicHrStandSignup(String standIdStr, String fullName, String email, String password,
                                                  String phone, String orgType, String orgDetails,
                                                  UUID shiftId, UUID roleId, String availability,
                                                  String ip, String ua, String clientOrigin) {
        cleanExpiredAssignments();
        HrStand stand = getStandById(standIdStr);
        if (stand == null) {
            throw new IllegalArgumentException("Stand not found");
        }

        // 1. Check if the stand or specific shift is already expired
        HrShift shift = null;
        if (stand.getShifts() != null) {
            for (HrShift sh : stand.getShifts()) {
                if (shiftId.equals(sh.getId())) {
                    shift = sh;
                    break;
                }
            }
        }

        if (isStandExpired(stand) || (shift != null && isShiftExpired(stand.getEventDate(), shift.getEndTime()))) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("success", false);
            errResponse.put("message", "Acest schimb sau stand s-a încheiat deja și nu mai acceptă înscrieri.");
            return errResponse;
        }

        // 2. Check if person is already assigned to this shift
        boolean alreadyAssigned = hrRepository.findAllAssignments().stream()
                .anyMatch(a -> shiftId.equals(a.getShiftId()) && email != null && email.trim().equalsIgnoreCase(a.getMemberEmail()));
        if (alreadyAssigned) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("success", false);
            errResponse.put("message", "Ești deja înscris pe acest schimb.");
            return errResponse;
        }

        // 3. Check role capacity / quota for this shift
        if (shift != null && !hasShiftCapacity(shift, roleId)) {
            HrStandRole requestedRole = getAllStandRoles().stream().filter(r -> r.getId().equals(roleId)).findFirst().orElse(null);
            String roleName = requestedRole != null ? requestedRole.getName() : "acest rol";
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("success", false);
            errResponse.put("message", "Toate locurile pentru rolul de " + roleName + " pe acest schimb au fost deja ocupate.");
            return errResponse;
        }

        if (adminAuthService != null) {
            Optional<AdminUser> existing = adminUserRepository != null ? adminUserRepository.findByEmail(email) : Optional.empty();

            if (existing.isPresent() && existing.get().getStatus() == AdminStatus.APPROVED) {
                AdminUser user = existing.get();
                HrShiftAssignment assignment = assignMemberToShift(shiftId, user.getId(), roleId);
                HrMember member = getMemberById(user.getId());
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("member", member);
                response.put("assignment", assignment);
                response.put("isNewMember", false);
                response.put("message", "Înscrierea pe schimb a fost realizată cu succes!");
                return response;
            } else if (existing.isPresent() && existing.get().getStatus() == AdminStatus.PENDING_APPROVAL) {
                // Email already verified, hold slot for 24 hours
                AdminUser user = existing.get();
                HrShiftAssignment assignment = holdShiftSlot(shiftId, user.getId(), roleId, stand.getId());
                HrMember member = getMemberById(user.getId());
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("pendingApproval", true);
                response.put("member", member);
                response.put("assignment", assignment);
                response.put("isNewMember", false);
                response.put("message", "Înscrierea pe schimb a fost trimisă spre aprobarea coordonatorului (loc rezervat pentru 24 de ore).");
                return response;
            } else {
                // New user or unverified email: create user in PENDING_EMAIL_VERIFICATION, do NOT hold slot yet
                adminAuthService.getOrCreateUserForPublicSignup(
                        fullName, email, password, phone, orgType, orgDetails, shiftId, roleId, stand.getId(), ip, ua, clientOrigin
                );
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("requiresEmailVerification", true);
                response.put("isNewMember", true);
                response.put("message", "Pentru a activa rezervarea pe schimb, te rugăm să confirmi adresa de email accesând link-ul trimis la " + email + ".");
                return response;
            }
        } else {
            HrMember existingMember = hrRepository.findMemberByEmail(email).orElse(null);
            boolean isNewMember = false;
            if (existingMember == null) {
                isNewMember = true;
                existingMember = new HrMember(
                        UUID.randomUUID(), fullName, email, phone, "Resurse Umane", "Voluntar", "Active", availability, "Auto-înregistrat via link stand"
                );
                createMember(existingMember);
            }
            HrShiftAssignment assignment = assignMemberToShift(shiftId, existingMember.getId(), roleId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("member", existingMember);
            response.put("assignment", assignment);
            response.put("isNewMember", isNewMember);
            response.put("message", "Înscrierea pe schimb a fost realizată cu succes!");
            return response;
        }
    }

    // --- 6. FEEDBACK & COMPLAINTS SYSTEM ---
    public List<HrFeedbackCategory> getFeedbackCategories() {
        return hrRepository.findAllFeedbackCategories();
    }

    public HrFeedbackCategory createFeedbackCategory(String name) {
        if (name == null || name.trim().isBlank()) {
            throw new IllegalArgumentException("Numele categoriei este obligatoriu.");
        }
        return hrRepository.createFeedbackCategory(name.trim());
    }

    public HrFeedbackCategory updateFeedbackCategory(UUID id, String name) {
        if (name == null || name.trim().isBlank()) {
            throw new IllegalArgumentException("Numele categoriei este obligatoriu.");
        }
        return hrRepository.updateFeedbackCategory(id, name.trim());
    }

    public void deleteFeedbackCategory(UUID id) {
        hrRepository.deleteFeedbackCategory(id);
    }

    public VolunteerFeedback submitVolunteerFeedback(VolunteerFeedback feedback) {
        if (feedback.getContent() == null || feedback.getContent().trim().isBlank()) {
            throw new IllegalArgumentException("Mesajul de feedback este obligatoriu.");
        }
        if (feedback.getIsAnonymous() == null) {
            feedback.setIsAnonymous(true);
        }
        if (Boolean.TRUE.equals(feedback.getIsAnonymous())) {
            feedback.setUserId(null);
            feedback.setSubmitterName(null);
            feedback.setSubmitterEmail(null);
        }
        feedback.setStatus("NEW");
        VolunteerFeedback saved = hrRepository.saveVolunteerFeedback(feedback);
        if (geminiFeedbackAnalysisService != null) {
            geminiFeedbackAnalysisService.invalidateCache();
        }
        return saved;
    }

    public List<VolunteerFeedback> getVolunteerFeedbackList(
            String status,
            String type,
            UUID categoryId,
            Boolean isAnonymous,
            Boolean isPublicSubmission,
            String searchQuery,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return hrRepository.findVolunteerFeedback(status, type, categoryId, isAnonymous, isPublicSubmission, searchQuery, startDate, endDate);
    }

    public VolunteerFeedback getVolunteerFeedbackById(UUID id) {
        return hrRepository.findVolunteerFeedbackById(id).orElse(null);
    }

    public void updateVolunteerFeedback(UUID id, String status, UUID categoryId, String internalNotes, UUID resolverId) {
        hrRepository.updateVolunteerFeedback(id, status, categoryId, internalNotes, resolverId);
        if (geminiFeedbackAnalysisService != null) {
            geminiFeedbackAnalysisService.invalidateCache();
        }
    }

    public void deleteVolunteerFeedback(UUID id) {
        hrRepository.deleteVolunteerFeedback(id);
        if (geminiFeedbackAnalysisService != null) {
            geminiFeedbackAnalysisService.invalidateCache();
        }
    }

    public com.charityapp.dto.hr.FeedbackSummaryDto getFeedbackSummary(LocalDate startDate, LocalDate endDate) {
        List<VolunteerFeedback> allItems = hrRepository.findVolunteerFeedback(null, null, null, null, null, null, startDate, endDate);
        com.charityapp.dto.hr.FeedbackSummaryDto summary = new com.charityapp.dto.hr.FeedbackSummaryDto();

        summary.setTotalSubmissions(allItems.size());

        long unresolved = allItems.stream()
                .filter(f -> "NEW".equalsIgnoreCase(f.getStatus()) || "IN_REVIEW".equalsIgnoreCase(f.getStatus()))
                .count();
        summary.setUnresolvedCount(unresolved);

        Map<String, Long> countByType = new HashMap<>();
        Map<String, Long> countByStatus = new HashMap<>();
        Map<String, Long> countByCategory = new HashMap<>();

        for (VolunteerFeedback item : allItems) {
            String t = item.getType() != null ? item.getType().toUpperCase() : "COMPLAINT";
            countByType.put(t, countByType.getOrDefault(t, 0L) + 1);

            String s = item.getStatus() != null ? item.getStatus().toUpperCase() : "NEW";
            countByStatus.put(s, countByStatus.getOrDefault(s, 0L) + 1);

            String cat = item.getCategoryName() != null ? item.getCategoryName() : "General";
            countByCategory.put(cat, countByCategory.getOrDefault(cat, 0L) + 1);
        }

        summary.setCountByType(countByType);
        summary.setCountByStatus(countByStatus);
        summary.setCountByCategory(countByCategory);

        // Top category
        String topCat = countByCategory.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("-");
        summary.setTopCategory(topCat);

        // Gemini AI theme clustering grounded in existing categories
        List<com.charityapp.dto.hr.FeedbackThemeDto> themes = Collections.emptyList();
        if (geminiFeedbackAnalysisService != null && !allItems.isEmpty()) {
            try {
                List<HrFeedbackCategory> existingCategories = hrRepository.findAllFeedbackCategories();
                List<String> existingCategoryNames = existingCategories.stream()
                        .map(HrFeedbackCategory::getName)
                        .filter(Objects::nonNull)
                        .toList();

                themes = geminiFeedbackAnalysisService.analyzeFeedbackThemes(allItems, existingCategoryNames);
            } catch (Exception e) {
                log.warn("Gemini feedback clustering failed: {}", e.getMessage());
            }
        }
        summary.setClusteredThemes(themes);

        String dominant = themes.stream()
                .max(Comparator.comparingInt(com.charityapp.dto.hr.FeedbackThemeDto::getCount))
                .map(com.charityapp.dto.hr.FeedbackThemeDto::getTheme)
                .orElse(topCat);
        summary.setDominantTheme(dominant);

        return summary;
    }

    public boolean isUserAuthorizedForStandOperation(UUID userId, UUID standId, String requiredRoleCategory) {
        if (hrRepository == null) return false;
        return hrRepository.isUserAuthorizedForStandOperation(userId, standId, requiredRoleCategory);
    }
}

