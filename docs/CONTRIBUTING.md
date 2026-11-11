# Contributing Guidelines

Thank you for contributing to Causeway. This guide outlines development practices, code style expectations, and the pull request process.

---

## 1. Development Environment

### Prerequisites
* Node.js: version 20 or higher, with npm 10+.
* Java Development Kit (JDK): version 17 or higher.
* Docker and Docker Compose: current stable release.

### Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/causeway.git
   cd causeway
   ```
2. Install workspace dependencies:
   ```bash
   npm install
   ```
3. Prepare environment:
   ```bash
   cp .env.example .env
   ```
4. Start development services:
   ```bash
   npm run dev
   ```

---

## 2. Standards and Practices

### Code Quality
* Keep user interface components functional, accessible, and concise. Avoid decorative or redundant UI elements.
* Ensure all user-facing copy is connected to the internationalization provider via `useLanguage`.
* Keep the platform strictly white-label. Reference tenant configurations via `TenantContext` on the frontend and `TenantProperties` on the backend.
* Run linters before opening pull requests:
  ```bash
  npm run lint --workspace=frontend
  ```

### Backend Standards
* Enforce access control on controller endpoints using `@RequirePermission("domain:action")`.
* Maintain table definitions within domain-specific schemas (`auth`, `hr`, `finance`, `logistics`, `legal`, `general`).
* Ensure all unit and integration tests pass:
  ```bash
  cd backend && ./gradlew test
  ```

---

## 3. Commit Conventions

Causeway uses the Conventional Commits specification for commit messages:

* feat: New features (e.g., `feat(logistics): add low-stock alert thresholds`)
* fix: Bug fixes (e.g., `fix(auth): correct token expiry boundary check`)
* docs: Documentation updates
* refactor: Code restructuring without behavior changes
* test: Adding or updating test suites
* chore: Dependency bumps and tooling configuration

---

## 4. Pull Request Workflow

1. Branch off `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Run test suites locally:
   ```bash
   npm run test --workspace=frontend
   cd backend && ./gradlew test
   ```
3. Commit changes using conventional commit formatting.
4. Push your branch to GitHub and open a Pull Request against the upstream repository.
5. Provide a summary of changes and reference relevant issues.
