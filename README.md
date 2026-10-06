# HustleHub+ — Part 2: Secure Stack

INSY7314 | Quantum Coder | Updated source package: 5 October 2026

HustleHub+ connects clients and freelancers. Clients browse and book gigs. Freelancers manage their own gigs, see received bookings and view income. Payments are simulated. Each successful booking creates a transaction linked to its booking, client and freelancer.

## Current source layout

This ZIP uses `backend/` and `frontend/`. The earlier planning files used `server/` and `client/`; those are not the run paths for this package. Team ownership remains unchanged. See `docs/part2/TEAM_HANDOFF.md` before combining this work with other branches.

| Layer | Path | Responsibility |
| --- | --- | --- |
| React | frontend/src/ | Screens, form validation, verified session and API requests |
| Express | backend/src/routes/, middleware/, controllers/ | JWT, roles, validation, limiting and safe responses |
| Business rules | backend/src/services/ | Gig ownership, booking, transaction and income rules |
| Database access | backend/src/repositories/, schemas/ | MongoDB users, gigs, bookings and transactions |

## Implemented features

- Client/freelancer registration, login, verified profile and logout.
- Public browsing of active gigs.
- Freelancer creation, viewing, editing and deletion of owned gigs.
- Booking confirmation and simulated transaction creation for clients.
- Client booking history and freelancer received-booking lists.
- Freelancer income calculated from that freelancer's transactions.
- Booking title and price snapshots, retained after a gig is edited or deleted.
- Loading, empty, error/retry states and disabled mutation buttons.
- Basic automated frontend rendering/interaction tests and backend checks.

The existing tax estimate is retained from the supplied project. It is an estimate on marketplace income only. Tax expansion, Docker execution, CI/CD and monitoring are Part 3 work, and were not assessed as missing Part 2 features.

## Security and role policy

| Capability | Client | Freelancer | Admin |
| --- | --- | --- | --- |
| Browse active public gigs | Yes | Yes | Yes |
| Read own verified profile | Yes | Yes | Yes |
| Create/edit/delete own gigs | No | Yes | No |
| Create/view own bookings | Yes | No | No |
| View received bookings and own income | No | Yes | No |

Admin is deliberately restricted to public browsing and its own profile at this stage. Public signup cannot create admin accounts. No unrestricted admin override exists. Any future admin capability needs an explicit server-side policy.

Passwords are hashed with bcrypt (normal default work factor 12). New passwords are limited to 72 UTF-8 bytes so bcrypt does not silently discard a password suffix. JWTs are signed, issued with a one-hour default lifetime, and checked for signature, issuer and expiry on every protected request. The server reloads the user to obtain the trusted role. Password hashes and secrets are never returned in normal API responses.

The browser stores its token in localStorage. It checks the saved session through `/api/auth/profile` after reload, logs out at the expiry supplied by the backend, and clears a session when a protected request returns 401. LocalStorage was kept to preserve the supplied app's simple session design; safe text rendering, sanitisation and document CSP remain important.

Input validation checks types, lengths, prices, roles and IDs. Unexpected fields are rejected. Gig updates cannot change IDs or ownership. Booking accepts only a gig ID; client identity, freelancer identity and price come from the verified user and saved gig. Global NoSQL/XSS sanitisation is retained, and React renders values as text. Safe errors hide driver messages, paths and stack traces.

MongoDB is required for normal runs. A missing/unreachable database stops startup. If a running connection is unavailable, database-backed operations fail instead of switching to temporary data. In-memory repositories are used only under `NODE_ENV=test` for isolated Jest tests.

Booking and transaction writes are separate. If the transaction write fails, the service removes the booking before returning failure. This works with standalone MongoDB. It is compensating cleanup, not a multi-document atomic transaction: a crash or database outage during cleanup can still require reconciliation. A cleanup failure is logged with the booking ID. This limit is documented rather than claiming impossible orphan records.

Rate limits: global 300 requests/15 minutes; auth 20/15 minutes; booking creation 10/15 minutes. Dedicated limits return clear 429 JSON responses. Direct local runs do not trust forwarded IP headers. `TRUST_PROXY=1` is only for the controlled nginx proxy; the supplied Compose backend is not published directly.

## HTTPS and document CSP

The backend always starts with local HTTPS credentials. There is no HTTP fallback. Helmet sets API and built-page headers. The strict built-page CSP allows same-origin scripts/connections, permits inline styles, and blocks objects and framing.

After building React, the backend also serves the built app over the same HTTPS origin. Vite development pages and preview pages explicitly set document headers, and nginx has its own document CSP. Development alone permits inline scripts and local WebSocket connections for Vite refresh. Production/build serving does not permit inline scripts. If an external API origin is introduced later, update the page CSP and CORS together; the supplied setup uses `/api` on the same origin.

## Setup on Windows PowerShell

Use Node 24 (used for these checks), npm, MongoDB and OpenSSL. The locked frontend test dependencies need at least Node 22.22.2. Do not commit real `.env` files or HTTPS private keys.

1. Start a local MongoDB service, or prepare a MongoDB Atlas connection.
2. In `backend/`, configure the environment:

```powershell
npm.cmd ci
Copy-Item .env.example .env
$secretBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($secretBytes)
$rng.Dispose()
$jwtSecret = [Convert]::ToBase64String($secretBytes)
(Get-Content .env -Raw).Replace('replace_this_with_a_long_random_string_at_least_32_chars', $jwtSecret) | Set-Content .env
npm.cmd run gen-cert
```

Set `MONGODB_URI` in `backend/.env` to the correct database. The example is `mongodb://localhost:27017/hustlehub`. Leave `TRUST_PROXY=false` for direct local runs. A URI must be present and MongoDB must be reachable.

3. In `frontend/`:

```powershell
npm.cmd ci
npm.cmd run build
```

4. Back in `backend/`:

```powershell
npm.cmd start
```

Visit `https://localhost:5443`. Accept the local self-signed certificate warning for this development site. The React document and `/api` now share HTTPS and the same origin.

For frontend editing, run `npm.cmd run dev` in a second terminal in `frontend/`. Visit `http://localhost:5173`; Vite proxies `/api` to the HTTPS backend. This development page has a relaxed, documented CSP for hot refresh. `npm.cmd run preview` also proxies the API and sets the stricter build-page policy.

## Required testing

### Backend automated checks

```powershell
# backend/
npm.cmd test
```

Jest/Supertest runs against isolated in-memory repositories. It covers auth, public-admin rejection, JWT failure cases, roles, ownership, protected update fields, private lists, booking/transaction/income flow, historic prices and transaction-write cleanup. It does not prove MongoDB persistence.

### Frontend automated checks and build

```powershell
# frontend/
npm.cmd test
npm.cmd run build
```

Vitest/Testing Library uses mocked HTTP calls to check rendering, typing, form rejection, error feedback, confirmation, received-booking rendering and session handling. These are component tests, not a live-browser full-flow run.

### Live Postman/Newman

Use a dedicated test database such as `hustlehub_part2_test`. Stop the API, point `MONGODB_URI` at that database and restart. Do not point these fixture requests at your main demonstration data. The collection creates unique fictional accounts but does not erase existing records.

```powershell
# backend/; API is already running in another terminal
npm.cmd run test:api
```

This runs the 38-request collection and saves a summary without JWTs to `backend/test-results/newman-summary.json`. The rate probes repeat until they reach 429; accepting a missing gig as 404 is no longer counted as proof of rate limiting. Because this exhausts the IP's auth/booking budgets, wait 15 minutes or restart the dedicated test API before repeating the collection or using the UI on that API. `NEWMAN_BASE_URL` can override the default `https://localhost:5443`.

`--insecure` handling is scoped to local Newman checks with self-signed certificates. Frontend browser certificate handling is separate. Recheck the full application with real client/freelancer sessions and confirm records survive an API restart.

## Observed verification and remaining work

See `docs/part2/VERIFICATION.md` for the checks actually run on this fixed package. No old README claims of passed runs were carried forward as proof. Existing screenshots/architecture images from the supplied ZIP are reference material; they have not been recaptured for this updated version.

See `docs/part2/REMAINING_WORK.md` for local setup, live/manual checks and submission work still needed. The video link, application screenshots and final repository review remain outstanding.

## References

The original Harvard reference list is retained in `REFERENCES.md`. The supplied PoE, Part 2 pages 5–6 and marking rubric pages 12–14, controls this implementation scope.
