# Causeway

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.7-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC.svg)](https://tailwindcss.com/)

Causeway is an open-source, white-label operations platform built for non-profit foundations, non-governmental organizations (NGOs), and community charity campaigns. It provides an end-to-end management suite covering volunteer coordination, shift scheduling, inventory tracking across multiple distribution locations, legal agreements with Google Drive integration, multi-channel messaging via WhatsApp and Email, donation pickups, and automated receipt processing via Google Gemini Vision AI.

---

## Capabilities

* White-Label Architecture: Rebrand the entire platform dynamically (organization identity, mission, palette tokens, logos, terminology, legal entity, and affiliations) via environment variables or runtime administrative settings without modifying code.
* Volunteer and Shift Management: Shift scheduling per operational stand, volunteer registration and approvals, attendance tracking, and coordinator assignments.
* Logistics and Warehousing: Central inventory control, stock transfers between warehouses and field stands, minimum safety-stock alerts, and end-of-day reconciliation audits.
* Financial Records and Online Donations: Track cash donations, stand collections, and online card payments processed via Stripe.
* AI Receipt Extraction: Automatic expense ingestion and receipt data extraction powered by Google Gemini Vision.
* Legal Agreements and Document Sync: Templated sponsorship contracts and volunteer agreements with automated Google Drive and Docs synchronization.
* Communications Hub: Automated WhatsApp alerts via a dedicated Baileys microservice and newsletter dispatch via Resend or SMTP.
* Progressive Web App (PWA): Installable mobile application with Workbox caching strategies and VAPID push notifications.

---

## Quick Start

### Option A: Run with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/causeway.git
   cd causeway
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```

3. Launch the container stack:
   ```bash
   docker compose up --build -d
   ```

Endpoints:
* Web Application: http://localhost:8000 (or configured FRONTEND_PORT)
* Backend REST API: http://localhost:8080/api (or configured BACKEND_PORT)

---

### Option B: Local Development

Prerequisites: Node.js 20+, JDK 17+, PostgreSQL 16.

1. Install monorepo dependencies:
   ```bash
   npm install
   ```

2. Start the database:
   ```bash
   node scripts/start-db.js
   ```

3. Run development services concurrently:
   ```bash
   npm run dev
   ```

Services can also be run independently:
```bash
npm run dev:frontend    # Vite Dev Server -> http://localhost:5173
npm run dev:backend     # Spring Boot API -> http://localhost:8080
npm run dev:whatsapp    # WhatsApp Service -> http://localhost:3001
```

---

## Documentation

Detailed documentation guides are available in the `docs` directory:

| Guide | Description |
|---|---|
| [System Architecture](docs/ARCHITECTURE.md) | Technical topology, service responsibilities, and PostgreSQL domain schema isolation. |
| [Configuration](docs/CONFIGURATION.md) | Customization reference for white-labeling, brand colors, terminology, and environment variables. |
| [Deployment](docs/DEPLOYMENT.md) | Production Docker deployment, reverse proxy setup, SSL, and automated database backups. |
| [Contributing](docs/CONTRIBUTING.md) | Contribution standards, git conventions, and test execution procedures. |

---

## Tech Stack

### Frontend
* Framework: React 19, TypeScript 5.8, Vite 8
* Styling: Tailwind CSS v4 with dynamic CSS token injection
* Routing: React Router v7 with URL query parameter tab synchronization
* PWA: vite-plugin-pwa, Workbox service worker precaching, Web Push
* Testing: Vitest, React Testing Library, Oxlint, Playwright

### Backend
* Runtime: Java 17, Spring Boot 3.5.7, Gradle 8.11
* Security: JJWT 0.12, Aspect-Oriented Programming (AOP) RBAC, Double-Submit CSRF, PBKDF2 hashing, TOTP 2FA
* Persistence: PostgreSQL 16 with domain schemas (auth, hr, finance, logistics, legal, general), Flyway 10.20 migrations, hybrid Spring Data JPA and JdbcTemplate
* Integrations: Stripe Java SDK, Google Workspace APIs (Drive, Docs, Sheets, Gmail), Google Gemini AI, Resend Email API

### Microservices
* WhatsApp Gateway: Node.js 20, Express, TypeScript, @whiskeysockets/baileys multi-device socket client with rate-limiting queue

---

## Verification and Testing

```bash
# Frontend Unit & Component Tests
npm run test --workspace=frontend

# Frontend Code Linting
npm run lint --workspace=frontend

# Backend Test Suite
cd backend && ./gradlew test

# End-to-End Tests
npm run test:e2e
```

---

## License

Causeway is open-source software licensed under the [MIT License](LICENSE).
