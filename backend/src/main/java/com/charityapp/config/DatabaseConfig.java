package com.charityapp.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Value("${spring.datasource.url:}")
    private String fallbackUrl;

    @Value("${spring.datasource.username:}")
    private String fallbackUsername;

    @Value("${spring.datasource.password:}")
    private String fallbackPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String dbUrlToUse = (databaseUrl != null && !databaseUrl.trim().isEmpty())
                ? databaseUrl.trim()
                : System.getenv("DATABASE_URL");

        if (dbUrlToUse == null || dbUrlToUse.trim().isEmpty()) {
            dbUrlToUse = readDatabaseUrlFromEnvFile();
        }

        if (dbUrlToUse != null && !dbUrlToUse.trim().isEmpty()) {
            log.info("Configuring DataSource from single DATABASE_URL connection string...");
            try {
                String cleanUrl = dbUrlToUse.trim();

                // Handle postgresql:// or postgres:// or jdbc:postgresql://
                String uriString = cleanUrl;
                if (uriString.startsWith("jdbc:")) {
                    uriString = uriString.substring(5);
                }

                URI uri = new URI(uriString);
                String username = null;
                String password = null;

                if (uri.getUserInfo() != null) {
                    String[] userPass = uri.getUserInfo().split(":", 2);
                    username = userPass[0];
                    if (userPass.length > 1) {
                        password = userPass[1];
                    }
                }

                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath() != null ? uri.getPath() : "/charity_db";
                String query = uri.getQuery();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                boolean hasQuery = query != null && !query.isEmpty();
                if (hasQuery) {
                    jdbcUrl += "?" + query;
                }
                if (!jdbcUrl.contains("currentSchema=")) {
                    jdbcUrl += (hasQuery ? "&" : "?") + "currentSchema=public,donations,auth,finance,logistics,hr,fundraising,marketing,general,legal";
                }

                HikariConfig config = new HikariConfig();
                config.setJdbcUrl(jdbcUrl);
                config.setDriverClassName("org.postgresql.Driver");
                if (username != null) {
                    config.setUsername(username);
                }
                if (password != null) {
                    config.setPassword(password);
                }
                config.setMaximumPoolSize(5);

                HikariDataSource ds = new HikariDataSource(config);
                // Validate connection
                try (java.sql.Connection conn = ds.getConnection()) {
                    log.info("Successfully connected to PostgreSQL database at {}", host);
                }
                return ds;
            } catch (Exception e) {
                log.error("Failed to connect to DATABASE_URL ({}): {}. Falling back to in-memory DB.", dbUrlToUse, e.getMessage());
            }
        }

        log.info("Configuring DataSource using standard properties or in-memory fallback...");
        try {
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(fallbackUrl);
            config.setUsername(fallbackUsername);
            config.setPassword(fallbackPassword);
            if (fallbackUrl != null && fallbackUrl.contains(":h2:")) {
                config.setDriverClassName("org.h2.Driver");
            } else {
                config.setDriverClassName("org.postgresql.Driver");
            }
            config.setMaximumPoolSize(5);
            HikariDataSource ds = new HikariDataSource(config);
            try (java.sql.Connection conn = ds.getConnection()) {
                return ds;
            }
        } catch (Exception e) {
            log.warn("Local PostgreSQL not available ({}), starting with in-memory H2 DataSource", e.getMessage());
            HikariConfig h2Config = new HikariConfig();
            h2Config.setJdbcUrl("jdbc:h2:mem:charity_app_db;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;INIT=CREATE SCHEMA IF NOT EXISTS auth\\;CREATE SCHEMA IF NOT EXISTS general\\;CREATE SCHEMA IF NOT EXISTS hr\\;CREATE SCHEMA IF NOT EXISTS logistics\\;CREATE SCHEMA IF NOT EXISTS donations\\;CREATE SCHEMA IF NOT EXISTS finance\\;CREATE SCHEMA IF NOT EXISTS fundraising\\;CREATE SCHEMA IF NOT EXISTS legal\\;CREATE SCHEMA IF NOT EXISTS communication\\;CREATE SCHEMA IF NOT EXISTS projects");
            h2Config.setDriverClassName("org.h2.Driver");
            h2Config.setUsername("sa");
            h2Config.setPassword("");
            h2Config.setMaximumPoolSize(5);
            HikariDataSource ds = new HikariDataSource(h2Config);
            initH2Schema(ds);
            return ds;
        }
    }

    private void initH2Schema(DataSource ds) {
        try {
            org.springframework.jdbc.datasource.init.ResourceDatabasePopulator populator =
                    new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator();
            populator.addScript(new org.springframework.core.io.ClassPathResource("db/h2-schema.sql"));
            populator.setContinueOnError(true);
            populator.setIgnoreFailedDrops(true);
            populator.execute(ds);
            log.info("H2 in-memory tables and seed initialized successfully.");
        } catch (Exception ex) {
            log.warn("Notice initializing H2 schema: {}", ex.getMessage());
        }
    }

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            try (java.sql.Connection conn = flyway.getConfiguration().getDataSource().getConnection()) {
                String dbName = conn.getMetaData().getDatabaseProductName();
                if (dbName != null && dbName.toLowerCase().contains("h2")) {
                    log.info("In-memory H2 DataSource detected. Skipping PostgreSQL Flyway migrations (tables created by JPA).");
                    return;
                }
            } catch (Exception ex) {
                log.warn("Could not inspect database product for Flyway: {}", ex.getMessage());
            }
            flyway.migrate();
        };
    }

    private String readDatabaseUrlFromEnvFile() {
        String[] possiblePaths = { ".env", "backend/.env", "../.env" };
        for (String path : possiblePaths) {
            java.io.File file = new java.io.File(path);
            if (file.exists()) {
                try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.FileReader(file))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        line = line.trim();
                        if (line.startsWith("DATABASE_URL=")) {
                            String val = line.substring("DATABASE_URL=".length()).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (!val.isEmpty()) {
                                log.info("Loaded DATABASE_URL from {}", file.getAbsolutePath());
                                return val;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not read {}", file.getAbsolutePath(), e);
                }
            }
        }
        return null;
    }
}
