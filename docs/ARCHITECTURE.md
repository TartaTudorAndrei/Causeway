# System Architecture

This document describes the technical architecture, data model, microservices, and security boundaries of Causeway.

---

## 1. High-Level Topology

Causeway is organized as a multi-service monorepo with strict separation of concerns across client, gateway, application, and persistence layers:

* Client Layer: Desktop and mobile web browsers accessing the application directly or via the installed offline-first Progressive Web App (PWA).
* Gateway Layer: Nginx reverse proxy serving static React single-page application assets and proxying `/api/*` traffic to the backend.
* Application Services: Spring Boot 3.5 API handling business logic, authentication, RBAC authorization, and external integrations, alongside an isolated Node.js WhatsApp bot microservice.
* Persistence Layer: PostgreSQL 16 database partitioned into domain schemas, with a containerized automated backup service executing scheduled snapshots.
* External Cloud Providers: Stripe for payment processing, Google Workspace for Drive and Docs synchronization, Google Gemini for receipt vision OCR, and VAPID services for web push notifications.

---

## 2. Service Responsibilities

### 2.1 Gateway and Reverse Proxy (Nginx)
* Single entrypoint for external HTTP and HTTPS traffic.
* Serves pre-compiled Vite application bundles with client-side fallback to `index.html`.
* Proxies `/api/*` requests internally to the Spring Boot service (`http://backend:8080`).
* Applies gzip compression and immutable cache-control headers on static asset chunks.

### 2.2 Core Backend API (Spring Boot 3.5, Java 17)
* Stateless authentication using JJWT tokens with cookie-based session handling and Double-Submit CSRF protection.
* Aspect-Oriented Programming (AOP) enforcing role-based and permission-based access checks (`@RequirePermission`) across controller endpoints.
* Hybrid persistence strategy combining Spring Data JPA for domain modeling and Spring Data JDBC (`JdbcTemplate`) for reporting, financial reconciliation, and aggregations.
* Database migration lifecycle managed automatically by Flyway across dedicated domain schemas (`V1` through `V42`).
* Dynamic configuration engine resolving tenant settings from environment variables and administrative database records.

### 2.3 WhatsApp Microservice (Node.js 20, TypeScript)
* Establishes a persistent multi-device WebSocket connection to the WhatsApp network using `@whiskeysockets/baileys`.
* Rate-limited outgoing message queue with randomized intervals to protect against anti-ban network triggers.
* Protected by internal shared-secret authentication (`WHATSAPP_INTERNAL_SECRET`) so only the Spring Boot backend can enqueue messages.
* Dispatches messages only upon matching administrator-configured notification rules.

---

## 3. Database Schema Isolation

PostgreSQL tables are partitioned into isolated domain schemas to prevent namespace pollution and establish clear data boundaries:

| Schema | Purpose and Key Tables |
|---|---|
| auth | admin_users, roles, permissions, active_sessions, refresh_tokens, two_factor_codes, audit_logs, clubs |
| hr | stands, shifts, shift_assignments, stand_roles, volunteer_attendances |
| finance | finance_expenses, finance_online_donations, finance_stands, finance_sponsorships, finance_other_incomes |
| logistics | items, locations, location_stocks, stock_transfers, stock_adjustments, eod_reports, eod_mug_counts |
| donations | donations, donation_pickups |
| fundraising | sponsors, sponsorship_packages, fundraising_leads |
| legal | contract_templates, generated_contracts |
| general | calendar_events, tasks, notification_rules, system_configurations |

---

## 4. Frontend Application Architecture

The frontend is a single-page application built on React 19 and Vite 8, organized by functional domain:

* components/common: Shared UI components (Modal, ConfirmationModal, SearchInput, CustomSelect, DatePicker).
* components/public: Public-facing donation, contact, and registration layouts.
* components/finance, hr, logistics, legal, it: Role-gated administration dashboards.
* context: Global providers for TenantContext, LanguageContext, and AuthContext.
* config: Tenant fallback configurations and API endpoints.
* hooks: Custom hooks for permission enforcement, language selection, and tenant identity.
* services: HTTP client modules with CSRF interceptors and error handling.
* types: TypeScript interfaces and domain models.
