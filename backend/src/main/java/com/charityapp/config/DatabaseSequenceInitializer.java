package com.charityapp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;

@Component
public class DatabaseSequenceInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSequenceInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseSequenceInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
            String dbName = connection.getMetaData().getDatabaseProductName();
            if ("PostgreSQL".equalsIgnoreCase(dbName)) {
                log.info("PostgreSQL database detected. Aligning pickup_code_seq with existing donations...");
                String sql = """
                    SELECT setval('donations.pickup_code_seq', 
                        COALESCE((SELECT MAX(CAST(SUBSTRING(pickup_code FROM 5) AS INTEGER)) 
                                  FROM donations.donations 
                                  WHERE pickup_code ~ '^[A-Za-z]+-[0-9]+$'), 0) + 1, 
                        false);
                    """;
                try {
                    jdbcTemplate.execute(sql);
                    log.info("Successfully aligned pickup_code_seq.");
                } catch (Exception ex) {
                    log.warn("Could not align pickup_code_seq: {}", ex.getMessage());
                }
                syncClubs();
            } else {
                log.info("Non-PostgreSQL database ({}) detected. Skipping sequence and club alignment.", dbName);
            }
        } catch (Exception e) {
            log.warn("Failed to initialize database: {}", e.getMessage());
        }
    }

    private void syncClubs() {
        try {
            jdbcTemplate.execute("DELETE FROM auth.clubs WHERE name ILIKE '%ceta%' OR name LIKE '%Cet%uie%';");
            jdbcTemplate.execute("""
                INSERT INTO auth.clubs (id, name, organization_type, created_at, updated_at) VALUES
                    (gen_random_uuid(), 'Interact Community', 'Interact', NOW(), NOW()),
                    (gen_random_uuid(), 'Interact Central', 'Interact', NOW(), NOW()),
                    (gen_random_uuid(), 'Interact District', 'Interact', NOW(), NOW()),
                    (gen_random_uuid(), 'Interact Youth', 'Interact', NOW(), NOW()),
                    (gen_random_uuid(), 'Alt Club Interact', 'Interact', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotaract Community', 'Rotaract', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotaract Central', 'Rotaract', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotaract District', 'Rotaract', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotaract Youth', 'Rotaract', NOW(), NOW()),
                    (gen_random_uuid(), 'Alt Club Rotaract', 'Rotaract', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotary Community', 'Rotary', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotary Central', 'Rotary', NOW(), NOW()),
                    (gen_random_uuid(), 'Rotary District', 'Rotary', NOW(), NOW()),
                    (gen_random_uuid(), 'Alt Club Rotary', 'Rotary', NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET
                    organization_type = EXCLUDED.organization_type,
                    updated_at = NOW();
            """);
            log.info("Clubs synced successfully.");
        } catch (Exception ex) {
            log.warn("Could not sync auth.clubs: {}", ex.getMessage());
        }
    }
}

