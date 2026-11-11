package com.charityapp.repository.general;

import com.charityapp.model.general.GeneralDepartment;
import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.general.GeneralLocation;
import com.charityapp.model.general.GeneralTask;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class GeneralRepository {

    private static final Logger log = LoggerFactory.getLogger(GeneralRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public GeneralRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initTables() {
        try {
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS general;");
            
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS general.departments (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    "key" VARCHAR(100),
                    fallback VARCHAR(100),
                    color VARCHAR(50),
                    display_order INT DEFAULT 0,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                );
            """);

            Integer deptCount = 0;
            try {
                deptCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM general.departments", Integer.class);
            } catch (Exception ignored) {}
            if (deptCount == null || deptCount == 0) {
                jdbcTemplate.execute("""
                    INSERT INTO general.departments (id, name, "key", fallback, display_order)
                    VALUES
                        ('general', 'General', 'general.deptGeneral', 'General', 1),
                        ('finance', 'Finanțe', 'general.deptFinance', 'Finances', 2),
                        ('it', 'IT & Securitate', 'general.deptIT', 'IT', 3),
                        ('fundraising', 'Fundraising', 'general.deptFundraising', 'Fundraising', 4),
                        ('logistics', 'Logistică', 'general.deptLogistics', 'Logistics', 5),
                        ('hr', 'Resurse Umane', 'general.deptHR', 'HR', 6),
                        ('legal', 'Legal', 'general.deptLegal', 'Legal', 7),
                        ('marketing', 'Marketing', 'general.deptMarketing', 'Marketing', 8);
                """);
            }
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS general.dashboard_section_info (
                    section_key VARCHAR(50) PRIMARY KEY,
                    title VARCHAR(100) NOT NULL,
                    content_markdown TEXT NOT NULL DEFAULT '',
                    google_doc_url VARCHAR(1024),
                    updated_by VARCHAR(150),
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """);

            Integer sectionCount = 0;
            try {
                sectionCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM general.dashboard_section_info", Integer.class);
            } catch (Exception ignored) {}
            if (sectionCount == null || sectionCount == 0) {
                jdbcTemplate.execute("""
                    INSERT INTO general.dashboard_section_info (section_key, title, content_markdown)
                    VALUES
                        ('general', 'General', '# General\n\nOperational hub, calendar events, operational tasks, and stand map locations.'),
                        ('logistics', 'Logistics', '# Logistics\n\nStock levels, location inventories, item movements, and transfers.'),
                        ('finance', 'Finance', '# Finance\n\nCash flow, expenses, income records, reimbursements, and budgets.'),
                        ('hr', 'HR', '# HR\n\nVolunteers, team members, shifts, stands, and attendance.'),
                        ('fundraising', 'Fundraising', '# Fundraising\n\nDonation tracking, campaigns, sponsor relations, and revenue stats.'),
                        ('marketing', 'Marketing', '# Marketing\n\nPromotional campaigns, assets, social outreach, and media communications.'),
                        ('legal', 'Legal', '# Legal\n\nContracts, compliance documents, agreements, and permits.'),
                        ('admin', 'Admin', '# Admin\n\nUser roles, access control permissions, audit trails, and platform settings.'),
                        ('it', 'IT', '# IT\n\nSystem integrations, security rules, environment configs, and technical tools.');
                """);
            }


            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS general.calendar_events (
                    id UUID PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    event_date VARCHAR(50) NOT NULL,
                    event_time VARCHAR(20) NOT NULL,
                    department VARCHAR(100) NOT NULL,
                    created_by VARCHAR(255),
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                );
            """);

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS general.tasks (
                    id UUID PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    department VARCHAR(100) NOT NULL,
                    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                    status VARCHAR(20) NOT NULL DEFAULT 'todo',
                    assignee TEXT,
                    assignee_ids TEXT,
                    due_date VARCHAR(50),
                    created_by VARCHAR(255),
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                );
                ALTER TABLE general.tasks ALTER COLUMN assignee TYPE TEXT;
                ALTER TABLE general.tasks ADD COLUMN IF NOT EXISTS assignee_ids TEXT;
                ALTER TABLE general.tasks ADD COLUMN IF NOT EXISTS start_date VARCHAR(50);
                ALTER TABLE general.tasks ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 3;
                ALTER TABLE general.calendar_events ADD COLUMN IF NOT EXISTS end_date VARCHAR(50);
            """);
            log.info("General schema tables initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize general schema tables: {}", e.getMessage(), e);
        }
    }

    private final RowMapper<GeneralEvent> eventRowMapper = (rs, rowNum) -> {
        GeneralEvent e = new GeneralEvent();
        e.setId(UUID.fromString(rs.getString("id")));
        e.setTitle(rs.getString("title"));
        e.setDescription(rs.getString("description"));
        e.setDate(rs.getString("event_date"));
        try {
            e.setEndDate(rs.getString("end_date"));
        } catch (Exception ignored) {}
        e.setTime(rs.getString("event_time"));
        e.setDepartment(rs.getString("department"));
        e.setCreatedBy(rs.getString("created_by"));

        try {
            e.setSpecialDemand(rs.getBoolean("is_special_demand"));
            double mult = rs.getDouble("demand_multiplier");
            e.setDemandMultiplier(rs.wasNull() || mult <= 0 ? 1.0 : mult);
            e.setDemandTag(rs.getString("demand_tag"));
        } catch (Exception ignored) {
            // Columns might not exist if running before migration
            e.setSpecialDemand(false);
            e.setDemandMultiplier(1.0);
        }

        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) e.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) e.setUpdatedAt(uat.toLocalDateTime());

        return e;
    };

    private final RowMapper<GeneralTask> taskRowMapper = (rs, rowNum) -> {
        GeneralTask t = new GeneralTask();
        t.setId(UUID.fromString(rs.getString("id")));
        t.setTitle(rs.getString("title"));
        t.setDescription(rs.getString("description"));
        t.setDepartment(rs.getString("department"));
        t.setPriority(rs.getString("priority"));
        t.setStatus(rs.getString("status"));
        t.setAssignee(rs.getString("assignee"));
        try {
            t.setAssigneeIds(rs.getString("assignee_ids"));
        } catch (Exception ignored) {}
        try {
            t.setStartDate(rs.getString("start_date"));
        } catch (Exception ignored) {}
        t.setDueDate(rs.getString("due_date"));
        try {
            t.setReminderCount(rs.getObject("reminder_count") != null ? rs.getInt("reminder_count") : 3);
        } catch (Exception ignored) {
            t.setReminderCount(3);
        }
        t.setCreatedBy(rs.getString("created_by"));

        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) t.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) t.setUpdatedAt(uat.toLocalDateTime());

        return t;
    };

    private final RowMapper<GeneralDepartment> departmentRowMapper = (rs, rowNum) -> {
        GeneralDepartment d = new GeneralDepartment();
        d.setId(rs.getString("id"));
        d.setName(rs.getString("name"));
        d.setKey(rs.getString("key"));
        d.setFallback(rs.getString("fallback"));
        d.setColor(rs.getString("color"));
        d.setDisplayOrder(rs.getInt("display_order"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) d.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) d.setUpdatedAt(uat.toLocalDateTime());
        return d;
    };

    // ================= DEPARTMENTS =================

    public List<GeneralDepartment> findAllDepartments() {
        String sql = "SELECT * FROM general.departments ORDER BY display_order ASC, name ASC";
        try {
            return jdbcTemplate.query(sql, departmentRowMapper);
        } catch (Exception e) {
            log.warn("Failed to query general.departments: {}", e.getMessage());
            return List.of();
        }
    }

    public Optional<GeneralDepartment> findDepartmentById(String id) {
        String sql = "SELECT * FROM general.departments WHERE id = ?";
        List<GeneralDepartment> results = jdbcTemplate.query(sql, departmentRowMapper, id);
        return results.stream().findFirst();
    }

    public GeneralDepartment saveDepartment(GeneralDepartment dept) {
        if (dept.getId() == null || dept.getId().isBlank()) {
            dept.setId(dept.getName().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("(^_|_$)", ""));
        }
        String sql = "INSERT INTO general.departments (id, name, \"key\", fallback, color, display_order, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) " +
                     "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, fallback = EXCLUDED.fallback, color = EXCLUDED.color, updated_at = NOW()";
        jdbcTemplate.update(sql,
                dept.getId(),
                dept.getName(),
                dept.getKey(),
                dept.getFallback() != null ? dept.getFallback() : dept.getName(),
                dept.getColor(),
                dept.getDisplayOrder() != null ? dept.getDisplayOrder() : 0
        );
        return dept;
    }

    public void updateDepartment(String id, GeneralDepartment dept) {
        String sql = "UPDATE general.departments SET name = ?, fallback = ?, color = ?, updated_at = NOW() WHERE id = ?";
        jdbcTemplate.update(sql,
                dept.getName(),
                dept.getFallback() != null ? dept.getFallback() : dept.getName(),
                dept.getColor(),
                id
        );
    }

    public void deleteDepartment(String id) {
        String sql = "DELETE FROM general.departments WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // ================= EVENTS =================

    public List<GeneralEvent> findAllEvents() {
        String sql = "SELECT * FROM general.calendar_events ORDER BY event_date ASC, event_time ASC";
        return jdbcTemplate.query(sql, eventRowMapper);
    }

    public List<GeneralEvent> findSpecialDemandEvents() {
        String sql = "SELECT * FROM general.calendar_events WHERE is_special_demand = TRUE ORDER BY event_date ASC";
        return jdbcTemplate.query(sql, eventRowMapper);
    }

    public Optional<GeneralEvent> findEventById(UUID id) {
        String sql = "SELECT * FROM general.calendar_events WHERE id = ?";
        List<GeneralEvent> results = jdbcTemplate.query(sql, eventRowMapper, id);
        return results.stream().findFirst();
    }

    public GeneralEvent saveEvent(GeneralEvent event) {
        if (event.getId() == null) {
            event.setId(UUID.randomUUID());
        }
        String sql = "INSERT INTO general.calendar_events (id, title, description, event_date, end_date, event_time, department, created_by, is_special_demand, demand_multiplier, demand_tag, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        jdbcTemplate.update(sql,
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getDate(),
                event.getEndDate() != null && !event.getEndDate().isBlank() ? event.getEndDate() : event.getDate(),
                event.getTime(),
                event.getDepartment(),
                event.getCreatedBy(),
                event.isSpecialDemand(),
                event.getDemandMultiplier() > 0 ? event.getDemandMultiplier() : 1.0,
                event.getDemandTag()
        );
        return event;
    }

    public void updateEvent(GeneralEvent event) {
        String sql = "UPDATE general.calendar_events SET title = ?, description = ?, event_date = ?, end_date = ?, event_time = ?, department = ?, is_special_demand = ?, demand_multiplier = ?, demand_tag = ?, updated_at = NOW() WHERE id = ?";
        jdbcTemplate.update(sql,
                event.getTitle(),
                event.getDescription(),
                event.getDate(),
                event.getEndDate() != null && !event.getEndDate().isBlank() ? event.getEndDate() : event.getDate(),
                event.getTime(),
                event.getDepartment(),
                event.isSpecialDemand(),
                event.getDemandMultiplier() > 0 ? event.getDemandMultiplier() : 1.0,
                event.getDemandTag(),
                event.getId()
        );
    }

    public void deleteEvent(UUID id) {
        String sql = "DELETE FROM general.calendar_events WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // ================= TASKS =================

    public List<GeneralTask> findAllTasks() {
        String sql = "SELECT * FROM general.tasks ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, taskRowMapper);
    }

    public Optional<GeneralTask> findTaskById(UUID id) {
        String sql = "SELECT * FROM general.tasks WHERE id = ?";
        List<GeneralTask> results = jdbcTemplate.query(sql, taskRowMapper, id);
        return results.stream().findFirst();
    }

    public GeneralTask saveTask(GeneralTask task) {
        if (task.getId() == null) {
            task.setId(UUID.randomUUID());
        }
        String sql = "INSERT INTO general.tasks (id, title, description, department, priority, status, assignee, assignee_ids, start_date, due_date, reminder_count, created_by, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        jdbcTemplate.update(sql,
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDepartment(),
                task.getPriority(),
                task.getStatus(),
                task.getAssignee(),
                task.getAssigneeIds(),
                task.getStartDate(),
                task.getDueDate(),
                task.getReminderCount() != null ? task.getReminderCount() : 3,
                task.getCreatedBy()
        );
        return task;
    }

    public void updateTask(GeneralTask task) {
        String sql = "UPDATE general.tasks SET title = ?, description = ?, department = ?, priority = ?, status = ?, assignee = ?, assignee_ids = ?, start_date = ?, due_date = ?, reminder_count = ?, updated_at = NOW() WHERE id = ?";
        jdbcTemplate.update(sql,
                task.getTitle(),
                task.getDescription(),
                task.getDepartment(),
                task.getPriority(),
                task.getStatus(),
                task.getAssignee(),
                task.getAssigneeIds(),
                task.getStartDate(),
                task.getDueDate(),
                task.getReminderCount() != null ? task.getReminderCount() : 3,
                task.getId()
        );
    }

    private final RowMapper<GeneralLocation> locationRowMapper = (rs, rowNum) -> {
        GeneralLocation loc = new GeneralLocation();
        loc.setId(UUID.fromString(rs.getString("id")));
        loc.setName(rs.getString("name"));
        loc.setCode(rs.getString("code"));
        loc.setType(rs.getString("type"));
        loc.setDescription(rs.getString("description"));
        try {
            double lat = rs.getDouble("latitude");
            if (!rs.wasNull()) loc.setLatitude(lat);
            double lng = rs.getDouble("longitude");
            if (!rs.wasNull()) loc.setLongitude(lng);
            loc.setAddress(rs.getString("address"));
        } catch (Exception ignored) {}
        loc.setSystem(rs.getBoolean("is_system"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) loc.setCreatedAt(cat.toLocalDateTime());
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) loc.setUpdatedAt(uat.toLocalDateTime());
        return loc;
    };

    public void deleteTask(UUID id) {
        String sql = "DELETE FROM general.tasks WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    // ================= LOCATIONS =================

    public List<GeneralLocation> findAllLocations() {
        String sql = "SELECT * FROM general.locations ORDER BY type ASC, name ASC";
        return jdbcTemplate.query(sql, locationRowMapper);
    }

    public Optional<GeneralLocation> findLocationById(UUID id) {
        String sql = "SELECT * FROM general.locations WHERE id = ?";
        List<GeneralLocation> results = jdbcTemplate.query(sql, locationRowMapper, id);
        return results.stream().findFirst();
    }

    public GeneralLocation saveLocation(GeneralLocation location) {
        if (location.getId() == null) {
            location.setId(UUID.randomUUID());
        }
        if (location.getCode() == null || location.getCode().isBlank()) {
            String prefix = "DEPOSIT".equalsIgnoreCase(location.getType()) ? "DEP-" : "STAND-";
            location.setCode(prefix + location.getId().toString().substring(0, 8).toUpperCase());
        }
        String sql = """
            INSERT INTO general.locations (id, name, code, type, description, latitude, longitude, address, is_system, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                code = EXCLUDED.code,
                type = EXCLUDED.type,
                description = EXCLUDED.description,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                address = EXCLUDED.address,
                updated_at = NOW()
        """;
        jdbcTemplate.update(sql,
                location.getId(),
                location.getName(),
                location.getCode(),
                location.getType() != null ? location.getType() : "STAND",
                location.getDescription(),
                location.getLatitude(),
                location.getLongitude(),
                location.getAddress(),
                location.isSystem()
        );
        return location;
    }

    public void updateLocation(GeneralLocation location) {
        String sql = """
            UPDATE general.locations
            SET name = ?, code = ?, type = ?, description = ?, latitude = ?, longitude = ?, address = ?, updated_at = NOW()
            WHERE id = ?
        """;
        jdbcTemplate.update(sql,
                location.getName(),
                location.getCode(),
                location.getType() != null ? location.getType() : "STAND",
                location.getDescription(),
                location.getLatitude(),
                location.getLongitude(),
                location.getAddress(),
                location.getId()
        );
    }

    public List<String> getLocationUsageReasons(UUID id, String name) {
        List<String> reasons = new ArrayList<>();

        // Check HR stands
        if (name != null && !name.trim().isEmpty()) {
            try {
                Integer standCount = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM hr.stands WHERE LOWER(location_name) = LOWER(?)",
                        Integer.class, name.trim()
                );
                if (standCount != null && standCount > 0) {
                    reasons.add("este atribuită la " + standCount + " stand(uri) HR");
                }
            } catch (Exception e) {
                log.warn("Error checking hr.stands usage for location {}: {}", name, e.getMessage());
            }
        }

        // Check Logistics stock levels
        try {
            Integer stockCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM logistics.location_stocks WHERE location_id = ? AND quantity > 0",
                    Integer.class, id
            );
            if (stockCount != null && stockCount > 0) {
                reasons.add("are " + stockCount + " tip(uri) de articole în stoc activ");
            }
        } catch (Exception e) {
            log.warn("Error checking logistics.location_stocks for location {}: {}", id, e.getMessage());
        }

        // Check Logistics transfers
        try {
            Integer transferCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM logistics.stock_transfers WHERE source_location_id = ? OR destination_location_id = ?",
                    Integer.class, id, id
            );
            if (transferCount != null && transferCount > 0) {
                reasons.add("este utilizată în " + transferCount + " transfer(uri) de stoc");
            }
        } catch (Exception e) {
            log.warn("Error checking logistics.stock_transfers for location {}: {}", id, e.getMessage());
        }

        // Check Logistics adjustments
        try {
            Integer adjCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM logistics.stock_adjustments WHERE location_id = ?",
                    Integer.class, id
            );
            if (adjCount != null && adjCount > 0) {
                reasons.add("are " + adjCount + " ajustări de stoc");
            }
        } catch (Exception e) {
            log.warn("Error checking logistics.stock_adjustments for location {}: {}", id, e.getMessage());
        }

        return reasons;
    }

    public void deleteLocation(UUID id) {
        String sql = "DELETE FROM general.locations WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    private final RowMapper<com.charityapp.model.general.DashboardSectionInfo> sectionInfoRowMapper = (rs, rowNum) -> new com.charityapp.model.general.DashboardSectionInfo(
            rs.getString("section_key"),
            rs.getString("title"),
            rs.getString("content_markdown"),
            rs.getString("google_doc_url"),
            rs.getString("updated_by"),
            rs.getTimestamp("updated_at")
    );

    public List<com.charityapp.model.general.DashboardSectionInfo> getAllSectionInfo() {
        String sql = "SELECT * FROM general.dashboard_section_info ORDER BY section_key ASC";
        return jdbcTemplate.query(sql, sectionInfoRowMapper);
    }

    public Optional<com.charityapp.model.general.DashboardSectionInfo> getSectionInfoByKey(String sectionKey) {
        String sql = "SELECT * FROM general.dashboard_section_info WHERE section_key = ?";
        List<com.charityapp.model.general.DashboardSectionInfo> list = jdbcTemplate.query(sql, sectionInfoRowMapper, sectionKey);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public com.charityapp.model.general.DashboardSectionInfo upsertSectionInfo(String sectionKey, String title, String contentMarkdown, String googleDocUrl, String updatedBy) {
        String sql = """
            INSERT INTO general.dashboard_section_info (section_key, title, content_markdown, google_doc_url, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (section_key) DO UPDATE SET
                title = EXCLUDED.title,
                content_markdown = EXCLUDED.content_markdown,
                google_doc_url = EXCLUDED.google_doc_url,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        """;
        return jdbcTemplate.queryForObject(sql, sectionInfoRowMapper, sectionKey, title, contentMarkdown, googleDocUrl, updatedBy);
    }
}
