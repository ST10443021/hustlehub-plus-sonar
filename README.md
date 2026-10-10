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
