package com.charityapp.cli;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DatabaseSeedRunner {

    public static void main(String[] args) {
        System.out.println("=== Database Seed Runner Starting ===");
        try {
            // Find root directory and dev_full_database_seed.sql
            Path seedPath = Paths.get("dev_full_database_seed.sql");
            if (!Files.exists(seedPath)) {
                seedPath = Paths.get("../dev_full_database_seed.sql");
            }
            if (!Files.exists(seedPath)) {
                throw new IllegalStateException("Could not find dev_full_database_seed.sql at " + seedPath.toAbsolutePath());
            }

            String databaseUrl = System.getenv("DATABASE_URL");
            String pgHost = System.getenv("PGHOST");
            String pgPort = System.getenv("PGPORT");
            String pgDatabase = System.getenv("PGDATABASE");
            String pgUser = System.getenv("PGUSER");
            String pgPassword = System.getenv("PGPASSWORD");
            String pgSslMode = System.getenv("PGSSLMODE");

            // Fallback: check env files if not present in process env
            if (databaseUrl == null || databaseUrl.isBlank()) {
                Path[] candidateFiles = new Path[] {
                    Paths.get(".env"),
                    Paths.get("../.env"),
                    Paths.get("backend/.env"),
                    Paths.get("../backend/.env")
                };
                for (Path envFile : candidateFiles) {
                    if (Files.exists(envFile)) {
                        for (String line : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
                            String trimmed = line.trim();
                            if (trimmed.startsWith("DATABASE_URL=")) {
                                databaseUrl = trimmed.substring("DATABASE_URL=".length()).trim();
                            } else if (trimmed.startsWith("PGHOST=") && (pgHost == null || pgHost.isBlank())) {
                                pgHost = trimmed.substring("PGHOST=".length()).trim();
                            } else if (trimmed.startsWith("PGUSER=") && (pgUser == null || pgUser.isBlank())) {
                                pgUser = trimmed.substring("PGUSER=".length()).trim();
                            } else if (trimmed.startsWith("PGPASSWORD=") && (pgPassword == null || pgPassword.isBlank())) {
                                pgPassword = trimmed.substring("PGPASSWORD=".length()).trim();
                            } else if (trimmed.startsWith("PGDATABASE=") && (pgDatabase == null || pgDatabase.isBlank())) {
                                pgDatabase = trimmed.substring("PGDATABASE=".length()).trim();
                            } else if (trimmed.startsWith("PGPORT=") && (pgPort == null || pgPort.isBlank())) {
                                pgPort = trimmed.substring("PGPORT=".length()).trim();
                            } else if (trimmed.startsWith("PGSSLMODE=") && (pgSslMode == null || pgSslMode.isBlank())) {
                                pgSslMode = trimmed.substring("PGSSLMODE=".length()).trim();
                            }
                        }
                    }
                }
            }

            String jdbcUrl;
            String user;
            String password;

            if (databaseUrl != null && !databaseUrl.isBlank()) {
                String cleanUrl = databaseUrl.trim();
                if (cleanUrl.startsWith("jdbc:")) {
                    cleanUrl = cleanUrl.substring(5);
                }
                URI uri = new URI(cleanUrl);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String dbName = uri.getPath().startsWith("/") ? uri.getPath().substring(1) : uri.getPath();

                String query = uri.getQuery();
                if (query != null && !query.isBlank()) {
                    jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName + "?" + query;
                } else {
                    jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName + "?sslmode=require";
                }

                if (uri.getUserInfo() != null) {
                    String[] parts = uri.getUserInfo().split(":", 2);
                    user = parts[0];
                    password = parts.length > 1 ? parts[1] : "";
                } else {
                    user = pgUser;
                    password = pgPassword;
                }
            } else {
                int port = (pgPort != null && !pgPort.isBlank()) ? Integer.parseInt(pgPort) : 5432;
                String ssl = (pgSslMode != null && !pgSslMode.isBlank()) ? pgSslMode : "require";
                jdbcUrl = "jdbc:postgresql://" + pgHost + ":" + port + "/" + pgDatabase + "?sslmode=" + ssl;
                user = pgUser;
                password = pgPassword;
            }

            System.out.println("Connecting to JDBC: " + jdbcUrl.replaceAll(":[^/@]+@", ":****@"));
            Class.forName("org.postgresql.Driver");

            String sql = Files.readString(seedPath, StandardCharsets.UTF_8);
            System.out.println("Read seed file: " + seedPath.toAbsolutePath() + " (" + sql.length() + " bytes)");

            try (Connection conn = DriverManager.getConnection(jdbcUrl, user, password);
                 Statement stmt = conn.createStatement()) {
                System.out.println("Connection established! Executing seed script...");
                stmt.execute(sql);
                System.out.println("Seed script executed successfully!");

                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM hr.volunteer_feedback")) {
                    if (rs.next()) {
                        System.out.println("Total rows in hr.volunteer_feedback: " + rs.getInt(1));
                    }
                }
                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM auth.admin_users")) {
                    if (rs.next()) {
                        System.out.println("Total rows in auth.admin_users: " + rs.getInt(1));
                    }
                }
            }

            System.out.println("=== Database Seeding Completed Successfully! ===");
        } catch (Exception e) {
            System.err.println("Database error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
