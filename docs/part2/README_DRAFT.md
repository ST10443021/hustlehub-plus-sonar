# HustleHub+ â€” Part 2 documentation draft

**Owner: Blake + Hamza. Draft only; merge verified information into the main README.**

## System overview

HustleHub+ lets freelancers offer services and clients book them. Each booking creates a simulated transaction and contributes to the correct freelancer's recorded income.

## Current status

The uploaded Part 1 code provides the login API and security foundations. This AI starter adds sample-data React layouts and frontend test starters. MongoDB, real marketplace routes, real frontend login/session handling, backend access rules, and integration are still to be completed.

## Architecture

Update the existing MERN diagram to show the implemented React pages, Express routes, MongoDB collections, and trust boundaries. Distinguish browser display checks from server-enforced access rules.

## Setup

- Frontend starter: `cd client`, `npm ci`, `npm run dev`.
- Frontend tests: `npm test` from `client`.
- Frontend build: `npm run build` from `client`.
- Backend: the working Part 1 backend is in `server/`. Keep its setup/start commands updated as integration changes.
- Database: document the connection variable, creation/seed steps, and how to use a separate test database after those steps exist.
- Document local HTTPS certificate handling and frontend/API browser permissions after integration is verified.

## Features to document after completion

Signup/login, role-specific screens, freelancer service management, client booking creation, both booking lists, transaction recording, and own-income display.

## Security decisions to explain

Password hashing, JWT verification, controlled admin creation, roles/ownership, validation/sanitisation, booking/authentication rate limits, Helmet/CSP, CORS, and safe errors. Explain what the implementation actually does rather than copying claims from the sample UI.

## Testing and evidence

List actual frontend and live backend tests, their commands, verified outcomes, and dated screenshots. Include Newman output only after the real backend suite has run. Mock tests do not prove MongoDB persistence or real JWT/role enforcement.

## Demonstration

Add the team's real full-flow video link after recording. Do not submit the sample-user demo as the completed application.

## References and contribution history

Retain verified references from Part 1 and add sources actually used in Part 2. Keep references in the required academic style. Preserve meaningful per-member Git commits; the Part 2 rubric's best band specifies 50+ clear commits and collaboration.

