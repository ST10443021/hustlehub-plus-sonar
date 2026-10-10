# HustleHub+ — Secure Freelance Marketplace

**INSY7314 · Portfolio of Evidence · Part 2: Secure Stack (Full-Stack MERN)**
Team: Quantum Coder · Last updated: 10 October 2026

HustleHub+ is a secure freelance marketplace. **Freelancers** advertise gigs, **clients** browse and book them, and every booking produces a **simulated-payment transaction** that feeds the freelancer's **income and estimated-tax dashboard**. Security is built into every layer: authentication, role-based access, validation, sanitisation, rate limiting, security headers, HTTPS and safe error handling.

---

## Table of Contents

1. [Team](#1-team)
2. [Technology Stack](#2-technology-stack)
3. [Architecture and Project Structure](#3-architecture-and-project-structure)
4. [Application Features (Functionality)](#4-application-features-functionality)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [API Security: JWT, Validation, Sanitisation](#6-api-security-jwt-validation-sanitisation)
7. [Rate Limiting](#7-rate-limiting)
8. [Security Headers, CSP and HTTPS](#8-security-headers-csp-and-https)
9. [API Reference](#9-api-reference)
10. [Income and Tax Estimate](#10-income-and-tax-estimate)
11. [React Frontend](#11-react-frontend)
12. [Logging](#12-logging)
13. [Running the Project](#13-running-the-project)
14. [Testing](#14-testing)
15. [Verification Status](#15-verification-status)
16. [Submission Evidence Checklist](#16-submission-evidence-checklist)
17. [Known Limitations and Part 3 Roadmap](#17-known-limitations-and-part-3-roadmap)
18. [Git Workflow and Collaboration](#18-git-workflow-and-collaboration)
19. [References](#19-references)

---

## 1. Team

| Name | Student Number | Main responsibility |
| --- | --- | --- |
| Blake Derek Godfrey | ST10435415 | Backend, auth and session, shared integration, income, security, final tests, README and evidence (with Hamza) |
| Syed Muhammad Hamza Kazmi | ST10443021 | Backend, JWT/auth middleware, environment config, rate limiting, shared integration, income, security, final tests, README and evidence (with Blake) |
| Connor Albertyn | ST10437293 | Frontend: `BrowseGigsPage.jsx` and `MyBookingsPage.jsx` (client browsing, booking confirmation, own bookings) |
| Muzammil Cassim | ST10259792 | Frontend: `MyGigsPage.jsx` and `ReceivedBookingsPage.jsx` (gig management, received bookings); backend error handling, HTTPS server and proxy configuration |

Per-file authorship is also recorded in header comments in the source. The shared component `frontend/src/components/BookingsPage.jsx` is used by both booking pages, so changes to it must be coordinated.

---

## 2. Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Axios, Vite 8 |
| Backend | Node.js (≥ 22.22.2), Express 4, native `https` server |
| Database | MongoDB with Mongoose 8 |
| Authentication | JSON Web Tokens (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| Security middleware | Helmet, CORS allow-list, `express-rate-limit`, `express-validator`, `express-mongo-sanitize`, `xss-clean` |
| Backend testing | Jest, Supertest, Postman collection, Newman |
| Frontend testing | Vitest, React Testing Library, `user-event`, jsdom |
| Containers | Docker, Docker Compose, nginx 1.27 (TLS-terminating reverse proxy) |

---

## 3. Architecture and Project Structure

### 3.1 Layered design

```
Browser (React SPA)
   │  HTTPS, same origin, /api
   ▼
Express: security middleware → routes → validators → auth/RBAC → controllers
   ▼
Services (business rules: ownership, booking, transaction, income, tax)
   ▼
Repositories (data access) → Mongoose schemas → MongoDB
```

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | `frontend/src/` | Screens, client-side validation, verified session, API calls |
| HTTP and security | `backend/src/routes/`, `middleware/`, `controllers/` | JWT, roles, validation, rate limiting, safe responses |
| Business rules | `backend/src/services/` | Gig ownership, booking, transaction creation, income and tax |
| Data access | `backend/src/repositories/`, `schemas/` | MongoDB users, gigs, bookings, transactions |

Controllers stay thin (HTTP ↔ service translation). Services hold every business and ownership rule, so rules cannot be bypassed by calling a different route.

### 3.2 Repository layout

```
HustleHub/
├── README.md                     # This document
├── REFERENCES.md                 # Full IIE Harvard reference list (Parts 1 and 2)
├── docker-compose.yml            # mongo + backend + frontend (nginx) stack
├── .gitignore
│
├── backend/                      # Express API
│   ├── src/
│   │   ├── server.js             # HTTPS-only entry point; refuses to start without certs or MongoDB
│   │   ├── app.js                # Security middleware stack, routes, static React serving
│   │   ├── config/
│   │   │   ├── env.js            # Validated environment config, tax brackets, fail-fast checks
│   │   │   └── db.js             # MongoDB connection
│   │   ├── routes/               # authRoutes, gigRoutes, bookingRoutes, incomeRoutes
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js # requireAuth (JWT) and requireRole (RBAC)
│   │   │   ├── validators.js     # express-validator rules, allow-listed body fields
│   │   │   └── errorHandler.js   # Centralised, non-leaking error responses
│   │   ├── controllers/          # auth, gig, booking, income (thin HTTP layer)
│   │   ├── services/             # authService, gigService, bookingService, incomeService
│   │   ├── repositories/         # user, gig, booking, transaction (Mongo + test-only memory)
│   │   ├── schemas/              # Mongoose models: User, Gig, Booking, Transaction
│   │   └── utils/eventLogger.js  # Structured security/business event log
│   ├── tests/                    # Jest + Supertest: api, gigManagement, income, security
│   ├── postman/                  # Part 1 and Part 2 Postman collections
│   ├── scripts/
│   │   ├── generateCert.js       # Local CA + localhost certificate (npm run gen-cert)
│   │   ├── trustCert.js          # Adds the local CA to the OS trust store (npm run trust-cert)
│   │   └── runNewman.js          # Runs the collection, writes a token-free summary
│   ├── certs/  logs/             # Git-ignored runtime output (.gitkeep only)
│   ├── Dockerfile                # Multi-stage, production dependencies only
│   ├── .env.example              # Environment template (never commit .env)
│   └── .env.test                 # Non-secret values for Jest
│
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── main.jsx, App.jsx     # Entry point and route table
│   │   ├── api/client.js         # Axios instance, bearer token, 401 handling, safe error text
│   │   ├── context/AuthContext.jsx   # Verified session, expiry timer, login/register/logout
│   │   ├── components/           # Navbar, ProtectedRoute, GigCard, BookingsPage, AlertMessage
│   │   ├── pages/                # Login, Register, BrowseGigs, MyGigs, MyBookings,
│   │   │                         # ReceivedBookings, Dashboard, NotFound
│   │   ├── lib/validation.js     # Client-side form validation
│   │   └── tests/                # Vitest + Testing Library component tests
│   ├── securityHeaders.js        # Document CSP/headers for Vite dev and preview
│   ├── vite.config.js            # HTTPS dev server, /api proxy, test config
│   ├── nginx.conf                # TLS, HSTS, CSP, SPA fallback, verified proxy to backend
│   ├── Dockerfile                # Build with Node, serve with nginx
│   └── .env.example
│
└── docs/part2/
    ├── VERIFICATION.md           # Dated record of checks actually run
    ├── REMAINING_WORK.md         # Outstanding evidence and manual checks
    ├── TEAM_HANDOFF.md           # Ownership and branch rules
    └── verification/newman-summary.json   # Token-free live Newman result
```

> **Housekeeping:** the repository still contains empty `client/` and `server/` folders (plus `server/Docs/screenshots/`, which holds the Part 1 Postman screenshots) from the earlier plan, a leftover Visual Studio `CHANGELOG.md`, and a `.vs/` folder. These are not run paths. Move the Part 1 screenshots under `docs/` and delete the leftovers before final submission.

---

## 4. Application Features (Functionality)

| Area | What it does |
| --- | --- |
| Authentication | Client/freelancer registration, login, verified profile, logout, automatic logout at token expiry |
| Gig management | Freelancers create, view, edit and delete **only their own** gigs |
| Marketplace | Anyone can browse active gigs (optional category filter); clients book from a confirmation dialog |
| Bookings | Client booking history; freelancer received-bookings list |
| Transactions | Every successful booking creates a simulated-payment transaction linked to the booking, client and freelancer |
| Income tracking | Freelancer income is summed from that freelancer's transactions only |
| Tax estimate | Annual tax estimate on the freelancer dashboard using SARS 2026/27 brackets (see [section 10](#10-income-and-tax-estimate)) |
| Data integrity | Booking stores a **title and price snapshot**, so history is correct after a gig is edited or deleted |
| Resilient UI | Loading, empty, error/retry states, field-level messages and disabled buttons while a request is pending |

### End-to-end flow

```
Register (freelancer) ──► Log in ──► Create gig
Register (client)     ──► Log in ──► Browse ──► Confirm booking
                                             └─► Booking + transaction created
Freelancer ──► Received Bookings ──► Dashboard (total income + estimated tax)
```

---

## 5. Role-Based Access Control (RBAC)

Access is enforced **on the server** by `requireAuth` then `requireRole(...)`. The frontend `ProtectedRoute` only improves the user experience; it is never the security boundary.

| Capability | Client | Freelancer | Admin |
| --- | :---: | :---: | :---: |
| Browse active public gigs | ✅ | ✅ | ✅ |
| Read own verified profile | ✅ | ✅ | ✅ |
| Create / edit / delete **own** gigs | ❌ | ✅ | ❌ |
| Create and view **own** bookings | ✅ | ❌ | ❌ |
| View received bookings and own income | ❌ | ✅ | ❌ |

**Ownership and object-level checks**

- `gigService.assertOwnership` is re-evaluated on every update and delete; another freelancer's request returns **403**.
- A booking accepts only a `gigId`. The client identity, freelancer identity and price are taken from the verified token and the saved gig, never from the request body.
- Gig updates cannot change `freelancerId`, IDs or other protected fields; unknown fields are rejected with **400**.
- A user cannot book their own gig.
- Lists (`/bookings/mine`, `/bookings/received`, `/gigs/mine`, `/income/summary`) are always scoped to the authenticated user.
- The server reloads the user from the database on every protected request to obtain the trusted role, so a stale or forged role claim in a token is ignored.

**Admin role.** Public sign-up cannot create admins (the `role` field accepts only `client` or `freelancer`). Admin is deliberately limited to public browsing and its own profile at this stage, and no unrestricted override exists. Any future admin capability needs an explicit server-side policy.

---

## 6. API Security: JWT, Validation, Sanitisation

### Authentication

- Passwords are hashed with **bcrypt** (default work factor 12, `BCRYPT_SALT_ROUNDS`). New passwords must be 8–72 characters (and ≤ 72 UTF-8 bytes, so bcrypt never silently truncates), with an uppercase letter, a lowercase letter and a digit.
- **JWTs** are signed, carry only `sub` and `role`, expire after 1 hour by default, and are verified for signature, issuer (`hustlehub-plus-api`) and expiry on **every** protected request.
- Failed token checks return a deliberately generic message so an attacker cannot tell *why* a token failed.
- Login failures are logged without exposing which of email or password was wrong.
- The app refuses to start if `JWT_SECRET` is missing, shorter than 32 characters, or still the placeholder value.
- Password hashes and secrets are never returned in API responses.

### Validation

- `express-validator` checks types, lengths, price ranges (R0–R1,000,000, max 2 decimals), booleans and MongoDB ID format.
- Request bodies use an **allow-list of fields**; unexpected properties are rejected.
- Request bodies are capped at **10 KB**, and malformed JSON returns a clean 400.

### Sanitisation

- `express-mongo-sanitize` strips NoSQL operator injection (`$gt`, `$ne`, …).
- `xss-clean` sanitises scripting payloads in input.
- React renders every value as text, giving a second layer against stored XSS.
- Values are not HTML-escaped again in validators, to avoid double-encoding on edits.

### Safe error handling

A central handler returns only intentionally exposed messages. Stack traces, driver errors, file paths and connection strings never reach the client; full detail goes to server-side logs only. Database errors (validation, duplicate key, cast errors) are mapped to safe 400/409 responses.

### Persistence behaviour

MongoDB is **required** for normal runs. A missing or unreachable database stops start-up, and a lost connection makes operations fail rather than switch to temporary data. In-memory repositories exist **only** under `NODE_ENV=test` for isolated Jest runs.

---

## 7. Rate Limiting

| Scope | Limit | Window | Response when exceeded |
| --- | --- | --- | --- |
| Global (all routes) | 300 requests | 15 min | **429** |
| Auth: `POST /api/auth/register`, `POST /api/auth/login` | 20 requests | 15 min | **429** `{"status":"error","message":"Too many attempts. Please try again later."}` |
| Booking: `POST /api/bookings` | 10 requests | 15 min (configurable) | **429** `{"status":"error","message":"Too many booking attempts. Please try again later."}` |

- Standard `RateLimit-*` headers are returned; legacy `X-RateLimit-*` headers are off.
- Booking limits are configurable through `BOOKING_RATE_LIMIT_WINDOW_MS` and `BOOKING_RATE_LIMIT_MAX`.
- Limiters are skipped **only** when `NODE_ENV=test`, so Jest is deterministic. Rate limiting is proven separately by Newman against a live server, where probes repeat until a 429 is received.
- Direct local runs do not trust forwarded IP headers. `TRUST_PROXY=1` is for the controlled nginx proxy only.

---

## 8. Security Headers, CSP and HTTPS

### Helmet and Content Security Policy (API and built pages)

```
default-src 'self'
script-src  'self'
style-src   'self' 'unsafe-inline'      # inline styles only; scripts are never inline
img-src     'self' data:
connect-src 'self'
object-src  'none'
frame-ancestors 'none'
base-uri    'self'
form-action 'self'
upgrade-insecure-requests
```

Helmet also sets HSTS, `X-Content-Type-Options`, and `Cross-Origin-Resource-Policy: same-site`, among others. CORS is restricted to an explicit origin allow-list (`CORS_ORIGINS`), never a wildcard.

| Serving mode | CSP source | Notes |
| --- | --- | --- |
| Built app via backend (`https://localhost:5443`) | Helmet in `app.js` | Strict: no inline scripts |
| Vite dev server | `frontend/securityHeaders.js` (dev) | Relaxed only for hot refresh (inline script, local WebSocket) |
| Vite preview | `frontend/securityHeaders.js` (build) | Strict build policy |
| Docker / nginx | `frontend/nginx.conf` | Same CSP plus HSTS, `X-Frame-Options: DENY`, `Referrer-Policy` |

If an external API origin is ever introduced, update the CSP and CORS together.

### HTTPS only

The backend binds to Node's native `https` module and **will not fall back to HTTP**. `npm run gen-cert` creates a small local Certificate Authority and a `localhost` certificate signed by it (SAN: `localhost`, `backend`, `127.0.0.1`, `::1`). `npm run trust-cert` adds that CA to your trust store so the browser shows a padlock instead of "Not secure" (Cooper et al., 2008; Mozilla, 2026a; Valsorda, n.d.).

Certificates are for **local development only**, are git-ignored, and `*.pem` files must never be committed. Production (Part 3) should use a certificate from a public CA such as Let's Encrypt (Let's Encrypt, n.d.).

---

## 9. API Reference

Base URL: `https://localhost:5443`. Authenticated routes need `Authorization: Bearer <token>`. All responses are JSON with a `status` of `success` or `error`.

| Method | Endpoint | Auth | Role | Purpose | Key responses |
| --- | --- | :---: | --- | --- | --- |
| GET | `/health` | No | Any | Health check | 200 |
| POST | `/api/auth/register` | No | Any | Register (`email`, `password`, optional `role`) | 201, 400, 409, 429 |
| POST | `/api/auth/login` | No | Any | Returns `token`, `user`, `expiresAt` | 200, 400, 401, 429 |
| GET | `/api/auth/profile` | Yes | Any | Verify session, return user | 200, 401 |
| GET | `/api/gigs` | No | Any | Browse active gigs (`?category=`) | 200, 400 |
| GET | `/api/gigs/mine` | Yes | Freelancer | List own gigs | 200, 401, 403 |
| POST | `/api/gigs` | Yes | Freelancer | Create gig | 201, 400, 403 |
| PUT | `/api/gigs/:id` | Yes | Freelancer (owner) | Update own gig | 200, 400, 403, 404 |
| DELETE | `/api/gigs/:id` | Yes | Freelancer (owner) | Delete own gig | 200, 400, 403, 404 |
| POST | `/api/bookings` | Yes | Client | Book a gig (`gigId`); creates booking + transaction | 201, 400, 403, 404, 429 |
| GET | `/api/bookings/mine` | Yes | Client | Own bookings | 200, 403 |
| GET | `/api/bookings/received` | Yes | Freelancer | Bookings on own gigs | 200, 403 |
| GET | `/api/income/summary` | Yes | Freelancer | Income and tax estimate | 200, 403 |

### Data model

| Collection | Key fields |
| --- | --- |
| `User` | `email` (unique, lowercase), `passwordHash`, `role`, `createdAt` |
| `Gig` | `title`, `description`, `category`, `price`, `freelancerId`, `isActive` |
| `Booking` | `gigId`, `clientId`, `freelancerId`, `priceAtBooking`, `gigTitle`, `status` |
| `Transaction` | `bookingId`, `freelancerId`, `clientId`, `amount`, `type: booking_payment_simulated` |

### Booking and transaction rule

The booking and the transaction are separate writes. If the transaction write fails, the service removes the booking before reporting failure, and logs `booking_cleanup_failed` with the booking ID if even that cleanup cannot complete. This works on standalone MongoDB. It is **compensating cleanup, not a multi-document atomic transaction**; see [section 17](#17-known-limitations-and-part-3-roadmap).

---

## 10. Income and Tax Estimate

The freelancer dashboard shows total income, tax-year income and an **estimated annual tax**, calculated from the SARS 2026/27 individual brackets and the R17,820 primary rebate (SARS, 2026).

| Rule | Behaviour |
| --- | --- |
| Tax-year filter | Only income from the current SARS tax year (1 March to end of February, South African time, UTC+2) is taxed. Earlier income still counts toward total income. |
| Tax threshold | The rebate cancels tax on the first R99,000 (R17,820 ÷ 18%). Below that, **R0.00 is the correct result**, and the dashboard explains it and shows how far the freelancer is from the threshold. |

Worked examples:

| Tax-year income | Estimated tax | Effective rate |
| --- | --- | --- |
| R10,500 (3 × R3,500) | R0.00 | 0% |
| R150,000 | R9,180 | 6.12% |
| R160,500 | R11,070 | ≈ 6.9% |

To demonstrate a non-zero figure, book gigs totalling more than R99,000. The result is an **estimate on marketplace income only and is not tax advice**; the API returns this disclaimer with every summary.

---

## 11. React Frontend

| Route | Access | Screen |
| --- | --- | --- |
| `/` | Public | Browse gigs; clients see "Book this gig" and a confirmation dialog |
| `/login`, `/register` | Public | Authentication forms with client-side validation and server error display |
| `/my-gigs` | Freelancer | Create, edit and delete own gigs |
| `/received-bookings` | Freelancer | Bookings received on own gigs |
| `/dashboard` | Freelancer | Income and estimated tax |
| `/my-bookings` | Client | Own booking history |
| `/404`, `*` | Public | Not-found page |

**Security and UX behaviour**

- The session is verified with `/api/auth/profile` after every reload, the user is logged out at the expiry time supplied by the backend, and a 401 on any protected call clears the session.
- Forms reject invalid input before sending (email, password rules, gig length and price) and show readable server error messages. Nothing sensitive (tokens, stack traces, hashes) is displayed.
- Mutation buttons are disabled while a request is pending to prevent duplicate bookings.
- The token is stored in `localStorage` to keep the supplied session design simple. That choice makes safe text rendering, sanitisation and the document CSP especially important, and is listed under limitations.

---

## 12. Logging

`backend/src/utils/eventLogger.js` appends structured JSON lines to `backend/logs/events.log` (git-ignored). Logged events include `user_registered`, `user_login`, `login_failed`, gig create/update/delete, booking creation, `booking_cleanup_failed`, and an `http_request` record (method, path, status, user ID) for every `/api/auth` and `/api/bookings` call.

Logs never contain passwords, hashes, JWTs or raw request bodies, so the log cannot become a new source of leakage. Part 3 will forward these events to monitored storage.

---

## 13. Running the Project

### Prerequisites

Node.js ≥ 22.22.2 (Node 24 used for checks), npm, MongoDB (local service or Atlas) and OpenSSL. Commands below are for **Windows PowerShell**; use `npm` instead of `npm.cmd` on macOS/Linux.

### Option A: Run locally

**1. Backend**

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env

# Generate a strong JWT secret and place it in .env
$secretBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($secretBytes); $rng.Dispose()
$jwtSecret = [Convert]::ToBase64String($secretBytes)
(Get-Content .env -Raw).Replace('replace_this_with_a_long_random_string_at_least_32_chars', $jwtSecret) | Set-Content .env

npm.cmd run gen-cert      # creates certs/rootCA.pem, cert.pem, key.pem
npm.cmd run trust-cert    # Windows asks you to confirm: choose Yes
```

Set `MONGODB_URI` in `backend/.env` (default `mongodb://localhost:27017/hustlehub`). Keep `TRUST_PROXY=false` for direct local runs. After `trust-cert`, fully close and reopen the browser. Firefox uses its own store: enable `security.enterprise_roots.enabled` in `about:config`, or import `certs/rootCA.pem`. Undo with `npm.cmd run trust-cert -- --remove`.

**2. Frontend**

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
```

**3. Start**

```powershell
cd backend
npm.cmd start
```

Open **https://localhost:5443**. The backend serves the built React app, so the UI and `/api` share one HTTPS origin.

**Frontend development mode:** run `npm.cmd run dev` in `frontend/` and open `https://localhost:5173`. Vite uses the same certificate and proxies `/api` to the backend. `npm.cmd run preview` serves the build with the stricter CSP.

### Option B: Docker Compose

```powershell
# 1. Create certificates first (mounted read-only into the containers)
cd backend; npm.cmd run gen-cert; cd ..

# 2. Create a root .env containing a strong JWT secret
"JWT_SECRET=<your 32+ character random secret>" | Set-Content .env

# 3. Build and start MongoDB, backend and frontend
docker compose up --build
```

nginx serves the app at **https://localhost:8443** (port 8080 only redirects to it), proxies `/api` to the backend, and verifies the backend certificate against the local CA instead of disabling verification. The backend is not published directly.

> **Note:** this Compose setup has **not been executed yet**; a full Docker run is Part 3 work.

### Environment variables (`backend/.env`)

| Variable | Purpose | Default / example |
| --- | --- | --- |
| `PORT` | HTTPS port | `5443` |
| `NODE_ENV` | `development`, `production` or `test` | `development` |
| `JWT_SECRET` | Token signing secret (≥ 32 chars, required) | none |
| `JWT_EXPIRES_IN` | Token lifetime | `1h` |
| `SSL_KEY_PATH`, `SSL_CERT_PATH` | HTTPS key and certificate | `./certs/key.pem`, `./certs/cert.pem` |
| `BCRYPT_SALT_ROUNDS` | bcrypt work factor | `12` |
| `MONGODB_URI` | MongoDB connection (required) | `mongodb://localhost:27017/hustlehub` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://localhost:5173,https://localhost:5443` |
| `BOOKING_RATE_LIMIT_WINDOW_MS` / `_MAX` | Booking limiter | `900000` / `10` |
| `TRUST_PROXY` | `1` only behind the controlled proxy | `false` |

Never commit `.env` files or private keys.

---

## 14. Testing

### 14.1 Backend: Jest and Supertest

```powershell
cd backend
npm.cmd test
```

Runs against isolated in-memory repositories (`NODE_ENV=test`). Four suites:

| Suite | Covers |
| --- | --- |
| `api.test.js` | Registration (no password hash returned), duplicate email (409), invalid input (400), generic 401 on wrong password, missing/valid token on the protected route, client blocked from creating gigs (403), freelancer creates gig (201), non-owner update blocked (403), public browsing, booking → transaction → income update, freelancer cannot book (403), client cannot read income (403), CSP header present |
| `gigManagement.test.js` | Owner edits and public browse reflects it, invalid edits leave the gig unchanged, clients/other freelancers/anonymous users cannot edit or delete, deletion preserves historic financial records, safe 404 when a gig disappears mid-request |
| `security.test.js` | Public API cannot create admins, ownership cannot be transferred, booking identity/price tampering rejected, failed transaction write removes the booking, private booking lists scoped to both parties, price/title snapshots survive edits and deletion, invalid JSON returns a safe 400, forwarded IPs not trusted by default, safe profile output |
| `income.test.js` | SARS 2026/27 brackets and rebate, tax-year boundaries (rollover at 1 March SAST), R10,500 → R0 with explanation, non-zero estimate above R99,000, previous-year income counted in total but not taxed again, empty-state note |

These tests do **not** prove MongoDB persistence; Newman does that against a real database.

### 14.2 Backend API: Postman and Newman

Use a **dedicated test database** (for example `hustlehub_part2_test`): stop the API, point `MONGODB_URI` at it, restart, then in a second terminal:

```powershell
cd backend
npm.cmd run test:api
```

`backend/postman/HustleHub_Part2.postman_collection.json` is a structured collection of **38 requests** in 7 folders, each with success and failure cases:

| Folder | Cases covered |
| --- | --- |
| 1. Auth Setup | Register/login for two freelancers and a client; public admin signup rejected; duplicate signup; wrong password; missing and invalid JWT |
| 2. Gig Management (RBAC + Ownership) | Client blocked (403); create (201); invalid input (400); public browse (200); own list; non-owner update blocked (403); owner update; ownership-field and unknown-field changes rejected; malformed ID rejected |
| 3. Bookings + Transactions | Freelancer cannot book (403); client books (201 + transaction); non-existent gig (404); client list; freelancer received list; client blocked from received (403); identity/price tampering rejected; other freelancer sees nothing |
| 4. Income Tracking (RBAC) | Freelancer summary ≥ R1,750; client blocked (403); second freelancer has R0 |
| 5. Gig Deletion (Ownership) | Non-owner delete blocked (403); owner deletes; historic booking survives |
| 6. Rate Limiting | Repeated booking and login calls must reach **429** |
| 7. API Headers | Security headers present on `/health` |

The runner writes a token-free summary to `backend/test-results/newman-summary.json`. `NEWMAN_BASE_URL` overrides the default `https://localhost:5443`. The Newman `--insecure` flag is scoped to local self-signed checks only.

> The rate-limit folder deliberately **exhausts** the IP's auth and booking budgets. Wait 15 minutes or restart the dedicated test API before re-running the collection or using the UI against it. The collection creates unique fictional accounts but does not erase existing records.

`HustleHub_Part1.postman_collection.json` is retained as Part 1 evidence.

### 14.3 Frontend: Vitest and React Testing Library

```powershell
cd frontend
npm.cmd test          # 28 component tests
npm.cmd run build     # production build
npm.cmd run lint      # oxlint
```

| Test file | Demonstrates |
| --- | --- |
| `LoginPage.test.jsx` | Fields and submit button render, typing works, safe error message on failed login |
| `RegisterPage.test.jsx` | Fields render, role defaults to client and can switch to freelancer, password constraints shown |
| `Marketplace.test.jsx` | Blank price is not accepted as free, field error after failed save, delete needs confirmation, received bookings load, loading state, booking confirmation sends only the gig ID, sign-up validated before the API call |
| `GigCard.test.jsx` | Title, category, description and formatted price render; optional "Book" action renders |
| `GigManagement.test.jsx` | Edit prefill and update, cancel editing, invalid edits never reach the API, failed save retry, Escape cancels delete, confirmed/failed delete, duplicate actions blocked while pending |
| `Dashboard.test.jsx` | R0 explained below the threshold; non-zero estimate above it |
| `Session.test.jsx` | Reload uses verified profile (not a saved role), expired session clears, backend-supplied expiry logs out |

These are component tests with mocked HTTP, not a live-browser end-to-end run.

---

## 15. Verification Status

The table lists only checks that were actually run (full detail in `docs/part2/VERIFICATION.md`). No earlier pass claims were carried forward as proof.

| Check | Result | Date | Scope |
| --- | --- | --- | --- |
| Backend Jest/Supertest | **46 passed, 0 failed** | 9 Oct 2026 | In-memory repositories |
| Frontend Vitest | **28 passed, 0 failed** | 9 Oct 2026 | Mocked HTTP |
| Frontend production build | Passed | 9 Oct 2026 | Vite build |
| Live Newman (real MongoDB 7, HTTPS) | **65 of 65 assertions passed** (56 HTTP requests incl. repeated limit probes) | 5 Oct 2026 | Isolated database, bcrypt factor 4 for speed |
| API restart persistence | Passed | 5 Oct 2026 | Income R1,750 survived restart; existing JWT still valid |
| Certificate chain and live HTTPS | Passed | 9 Oct 2026 | `openssl verify`; curl trusted only `rootCA.pem` |
| Tax figures (live) | Passed | 9 Oct 2026 | R10,500 → R0; R160,500 → R11,070 |
| CSP on built React document | Passed | 5 Oct 2026 | Served from HTTPS backend |

**Not yet run:** a manual browser walkthrough with real accounts, a phone-width layout review, the real browser padlock check, and Docker Compose. Re-run all three test commands on the exact version being submitted and keep the dated output.

---

## 16. Submission Evidence Checklist

| Deliverable | Status |
| --- | --- |
| Updated GitHub repository | ☐ Final review and merge into `main` |
| Updated README | ✅ This document |
| Backend and frontend code | ✅ |
| Postman collection | ✅ `backend/postman/HustleHub_Part2.postman_collection.json` |
| Newman execution evidence | ☐ Add fresh run output/screenshot for the final version (`docs/part2/verification/newman-summary.json` is from 5 Oct) |
| Frontend test evidence | ☐ Add fresh `npm test` screenshot for the final version |
| Screenshots of the application | ☐ Capture register, login, create gig, browse, booking confirmation, bookings lists, dashboard (store in `docs/screenshots/`) |
| Demonstration video link | ☐ Add link: `<paste link here>` |

**Video must show:** registration and login (both roles) → freelancer creates a gig → client books it → booking and transaction recorded → freelancer sees the received booking and income on the dashboard.

Existing Part 1 Postman screenshots are not evidence of this version and must not be presented as new.

---

## 17. Known Limitations and Part 3 Roadmap

**Known limitations (documented, not hidden)**

- Booking and transaction are two writes with compensating cleanup rather than an atomic multi-document transaction; a crash during cleanup could need reconciliation using the logged booking ID.
- The JWT is kept in `localStorage`. An `HttpOnly` cookie would remove script access to the token entirely and should be evaluated for production.
- Admin has no management endpoints yet; adding any requires an explicit server-side policy.
- The tax figure is an estimate on marketplace income only and is not tax advice.
- Rate-limit state is per-process memory; a multi-instance deployment needs a shared store.
- Docker Compose and the browser journey have not been executed on the final version.

**Part 3 (DevSecOps, monitoring and finalisation)**

- CI/CD pipeline covering backend and frontend: automated unit tests, API (Newman) tests and security scans (dependency audit, static analysis, image scanning)
- Full container hardening, health checks and executed Compose runs
- Centralised log forwarding and monitoring/alerting
- Public-CA certificates and production secret management

---

## 18. Git Workflow and Collaboration

- Each member works on their own lowercase first-name branch (`blake`, `hamza`, `connor`, `muzammil`); Blake and Hamza form one shared unit.
- Work is merged into `main` through **pull requests** with review. No direct pushes to `main`, no force pushes.
- Commits use short, descriptive messages (for example `feat(bookings): create transaction on booking`, `fix(auth): reject public admin signup`, `test(income): cover R99,000 threshold`).
- Coordinate changes to shared files: `BookingsPage.jsx`, `AuthContext.jsx`, `App.jsx`, `index.css`, and `backend/src/app.js`.
- Never commit `.env`, `*.pem`, `node_modules/`, `dist/`, or log files (all git-ignored).

---
