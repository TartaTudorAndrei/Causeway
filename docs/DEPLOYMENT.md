# Deployment Guide

This guide covers production deployment of Causeway using Docker Compose, reverse proxying, SSL certificate automation, and scheduled database backups.

---

## 1. Production Container Topology

Causeway is composed of five coordinated container services:

* frontend: Nginx Alpine container serving compiled React SPA assets and proxying `/api/*` requests to the backend container.
* backend: Spring Boot 3.5 API executing business logic, security filters, and Flyway database migrations.
* whatsapp-service: Node.js 20 microservice maintaining persistent WebSocket connectivity to the WhatsApp network.
* db: PostgreSQL 16 database using domain-separated schemas.
* db-backup: Automated snapshot container running scheduled `pg_dump` jobs against the database.

---

## 2. Production Deployment Steps

### 2.1 Clone and Environment Setup
```bash
git clone https://github.com/your-org/causeway.git
cd causeway
cp .env.example .env
```

Ensure the following variables are configured in `.env`:
* JWT_SECRET: Secure secret string at least 32 characters long.
* WHATSAPP_INTERNAL_SECRET: Shared secret between Spring Boot and the WhatsApp service.
* STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET: Production Stripe credentials.
* Organization and branding settings.

### 2.2 Start Container Stack
```bash
docker compose up --build -d
```

Verify service status:
```bash
docker compose ps
```

Port mapping:
* frontend: Port 8000 on host (routes to container port 80).
* backend: Port 8080 on host.
* db: Port 5432 on host.
* whatsapp-service: Internal network only (port 3001).
* db-backup: Internal network only with host volume mount to `./backups`.

---

## 3. Reverse Proxy and SSL Termination

Place an external reverse proxy (such as Caddy or an enterprise Nginx) in front of the `frontend` container to handle TLS termination.

Example Caddyfile:
```caddy
causeway.example.org {
    encode gzip zstd
    reverse_proxy localhost:8000
}
```

---

## 4. Database Backups and Recovery

The `db-backup` container runs automated scheduled snapshots:
* Snapshots are saved to `./backups` on the host machine.
* Backups run daily at midnight and are compressed as `.sql.gz` archives.
* Retention policies automatically remove archives older than the configured threshold.

Manual snapshot:
```bash
docker compose exec db pg_dump -U postgres charity_app > backup_manual.sql
```

Restoring from snapshot:
```bash
cat backup_manual.sql | docker compose exec -T db psql -U postgres charity_app
```

---

## 5. Security Checklist

Verify the following before opening the deployment to public traffic:
* Change all default secrets and passwords in `.env`.
* Ensure CORS_ALLOWED_ORIGINS is restricted to your production domain.
* Verify Google OAuth client ID and authorized redirect URIs match your domain.
* Enforce two-factor authentication (TOTP) for administrative accounts in IT Settings.
* Register Stripe webhook endpoint (`https://your-domain.com/api/webhooks/stripe`).
* Verify persistent volume write permissions for `./backups` and `./uploads`.
