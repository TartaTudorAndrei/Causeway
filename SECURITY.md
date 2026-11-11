# Security Policy

## Supported Versions

Security updates are applied to the active release and development branches:

| Branch / Version | Supported          |
| ---------------- | ------------------ |
| `main` / `dev`   | :white_check_mark: |
| < 1.0.0          | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Causeway and its deployments seriously. If you discover a vulnerability or security flaw, please report it responsibly so we can address it before public disclosure.

### How to Report

1. **Do NOT open a public issue.** Please avoid disclosing details in public GitHub issues, discussions, or pull requests.
2. Submit your report privately via **GitHub Security Advisories** (navigate to the **Security** tab of this repository and click **"Report a vulnerability"**), or email the maintainers directly at security@causeway.org (or the administrator email configured in your deployment).
3. Include the following details in your report:
   - Type of vulnerability (e.g., CSRF, privilege escalation, injection, sensitive data leak)
   - Step-by-step reproduction instructions or Proof of Concept (PoC)
   - Impact assessment and affected components (backend, frontend, or whatsapp microservice)
   - Any recommended remediation or patches

### Response Timeline

- **Initial Acknowledgement:** Within 48 hours of receipt.
- **Triage & Assessment:** Within 5 business days.
- **Fix & Patch Release:** Priority resolution based on CVSS severity rating.

## Best Practices for Deployers

When deploying Causeway in production:
- Always set strong, random values for `JWT_SECRET` (at least 32 bytes) and `WHATSAPP_INTERNAL_SECRET`.
- Never reuse default or placeholder credentials in `.env` for production environments.
- Enforce HTTPS and secure cookie attributes (`SameSite=Lax`, `Secure`, `HttpOnly`).
- Keep database credentials restricted to internal network boundaries.
