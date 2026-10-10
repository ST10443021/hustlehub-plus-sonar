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
