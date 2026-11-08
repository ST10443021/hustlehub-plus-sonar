# Changelog

All notable changes to HustleHub+ across the three parts of the INSY7314 PoE.

## 7 November 2026 — final repository integration

- Restored the final Part 3 README, references, GitHub Actions/Dependabot definitions, corrected Docker Compose configuration and original screenshot evidence that were missing from the repository snapshot.
- Declared Bash for workflow run steps so failures before `tee` cannot be hidden; retained test/build/audit output as artifacts and waited for all container health checks.
- Retained all existing application code and the team's four additional booking test files. Dated audit-workspace checks passed: backend 127 tests, frontend 63 tests, both linters, production audits and frontend build.
- Linked the existing Azure and security screenshots; kept final CI/scans, final Docker/Newman evidence and the final video link explicitly pending.
- Existing `.env`, private keys and database volumes are not included or modified by the patch. Separate-project verification instructions preserve prior data.

## Part 3 — DevSecOps, Monitoring and Finalisation (final PoE)

### Added
- **Tax and income dashboard:** bracket-by-bracket SARS 2026/27 breakdown, effective and marginal rate, income after tax, 12-month income bar chart (accessible SVG), progress towards the R99 000 threshold, plain-language methodology and recent payments.
- **CI/CD pipeline** (`.github/workflows/ci.yml`): install, ESLint, Jest, Vitest, `npm audit`, production builds, CodeQL, Trivy (repository and images), Docker Compose stack, Newman API tests, logging leak check, and a final gate job. Dependabot configuration.
- **Static analysis:** ESLint with `eslint-plugin-security` for the backend, and ESLint with React, React Hooks and security rules for the frontend, both with zero warnings allowed.
- **Docker:** hardened backend and frontend Dockerfiles (non-root, multi-stage, health checks), `docker-compose.yml` with authenticated MongoDB on an internal network, `.dockerignore` files, `.env.example`.
- **Logging and monitoring:** structured JSON events with severity and category, request IDs (`X-Request-Id`), redaction of sensitive values, log rotation, container-output logging and optional **cloud log shipping** (Better Stack) with batching, retry and flush on shutdown. New events for login failures, lockouts, denied access, rejected tokens, rate limiting, transactions and server errors.
- **Additional security features:** account lockout, server-side logout with token revocation, JWT algorithm pinning, and an admin security console (`/api/admin/*`, `/admin`).
- **Admin role:** read-only platform overview, account list and security events; `npm run seed-admin` to create the first administrator.
- **Tests:** backend 46 → 105 (lockout, revocation, admin RBAC, JWT pinning, injection payloads, logging and cloud shipping, analytics); frontend 28 → 54 (chart, dashboard analytics, admin page, route guard, sign-out); Postman collection 38 → 55 requests (Newman: 67 requests, 90 assertions).
- **Documentation:** full README (setup, code structure, security review, logging, pipeline, evidence), `docs/part3/STATIC_ANALYSIS.md`, `docs/part3/EVIDENCE.md`, IIE Harvard reference list.

### Changed
- Rate limiters share one factory (`middleware/rateLimiters.js`) and log every rejection.
- Frontend log-out now asks the server to revoke the token.
- Newman checks run against `/api/health`, and the authentication limiter probe uses an unknown account so it exercises the IP limiter rather than lockout.
- Compose no longer publishes the database port; the web server runs as an unprivileged nginx on ports 8443 and 8080.
- Repository tidied: empty `client/` and `server/` folders removed, screenshots moved under `docs/`, `.vs/` untracked, Visual Studio scaffold text removed from this file.

### Fixed
- ESLint findings: backtracking-prone ID regex, dynamic-key object access in the logger, stale lint directives, unescaped apostrophe in the login page (details in `docs/part3/STATIC_ANALYSIS.md`).
- Vulnerable transitive production dependencies in the backend (`body-parser`, `qs`, `ip-address`) updated with `npm audit fix`.

## Part 2 — Secure Stack

- React frontend with registration, login, gig management, browsing, booking and bookings pages.
- Gig management with ownership checks; bookings that create transaction records; freelancer income tracking and tax estimate.
- JWT authentication on all protected routes and role-based access control.
- Validation, sanitisation, rate limiting, Helmet and a Content Security Policy.
- Postman collection with Newman execution; Jest, Supertest, Vitest and React Testing Library suites.

## Part 1 — Secure Foundations

- Express API with bcrypt password hashing, JWT authentication, validation and safe error handling over HTTPS.
- Postman collection and screenshots.
