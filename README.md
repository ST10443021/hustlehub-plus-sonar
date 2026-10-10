# HustleHub+ — Secure Freelance Marketplace

**INSY7314 · Portfolio of Evidence · Part 2: Secure Stack (Full-Stack MERN)**
Team: Quantum Coder · Last updated: 10 October 2026

HustleHub+ is a secure freelance marketplace. **Freelancers** advertise gigs, **clients** browse and book them, and every booking produces a **simulated-payment transaction** that feeds the freelancer's **income and estimated-tax dashboard**. Security is built into every layer: authentication, role-based access, validation, sanitisation, rate limiting, security headers, HTTPS and safe error handling.

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

## Income and tax estimate

The freelancer dashboard shows total income and an estimated annual tax figure, calculated from SARS's 2026/27 individual brackets and the R17,820 primary rebate (SARS, 2026). Two rules keep the estimate correct:

- **Tax-year filter.** Only income earned in the current SARS tax year (1 March to the end of February, South African time) is taxed. Earlier income still counts towards total income.
- **Tax threshold.** The rebate cancels the tax on the first R99,000 of income (R17,820 / 18%), so a freelancer earning less than that sees **R0.00, which is the correct result**. For example, three R3,500 bookings (R10,500) gives R0. The dashboard says so, and shows how far the freelancer is from the threshold.

Once the tax-year income passes R99,000 the estimate becomes non-zero: R150,000 gives R9,180 (6.12% effective rate), and R160,500 gives R11,070. To demonstrate this, book a gig priced above R99,000 in total. The figure is an estimate on marketplace income only and is not tax advice. Docker execution, CI/CD and monitoring remain Part 3 work.

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

The backend always starts with local HTTPS credentials. There is no HTTP fallback (IIE, 2026a).

### Removing the "Not secure" warning

A browser only shows the padlock when the certificate was issued by an authority it trusts (Cooper et al., 2008; Mozilla, 2026a). A single self-signed certificate can never meet that, so earlier versions always showed "Not secure". `npm run gen-cert` now creates a small local Certificate Authority (CA) plus a `localhost` certificate signed by it, with `localhost`, `127.0.0.1` and `::1` in its Subject Alternative Name (Saint-Andre and Salz, 2023; OpenSSL Project, n.d.). `npm run trust-cert` adds that CA to your computer's trust store, the same idea as the mkcert tool (Valsorda, n.d.).

```powershell
# backend/
npm.cmd run gen-cert      # creates certs/rootCA.pem, certs/cert.pem and certs/key.pem
npm.cmd run trust-cert    # Windows asks you to confirm: choose Yes
```

Then fully close and reopen the browser (not just the tab) and visit the app again. Firefox keeps its own store: set `security.enterprise_roots.enabled` to `true` in `about:config`, or import `certs/rootCA.pem` under Settings > Privacy & Security > Certificates. To undo it, run `npm.cmd run trust-cert -- --remove`.

The certificates are for local development only and are git-ignored; never commit `*.pem` files. Each teammate must run both commands on their own computer. Production (Part 3) should use a certificate from a public CA such as Let's Encrypt (Let's Encrypt, n.d.). Helmet sets API and built-page headers. The strict built-page CSP allows same-origin scripts/connections, permits inline styles, and blocks objects and framing.

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
npm.cmd run trust-cert
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

Visit `https://localhost:5443` (or whatever `PORT` is set to in `backend/.env`). Once `npm run trust-cert` has been run there is no warning to accept. The React document and `/api` share HTTPS and the same origin.

For frontend editing, run `npm.cmd run dev` in a second terminal in `frontend/`. Visit `https://localhost:5173`; Vite uses the same certificate (Vite, n.d.) and proxies `/api` to the HTTPS backend. This development page has a relaxed, documented CSP for hot refresh. `npm.cmd run preview` also proxies the API and sets the stricter build-page policy.

### Docker Compose (HTTPS)

Run `npm run gen-cert` in `backend/` first. Compose mounts those certificates read-only into the containers. nginx serves the app at `https://localhost:8443` and only redirects port 8080 to it; it verifies the backend's certificate against the local CA instead of skipping verification (nginx, n.d.). This Compose configuration has not been executed in this update.

## Required testing

### Backend automated checks

```powershell
# backend/
npm.cmd test
```

Jest/Supertest runs against isolated in-memory repositories. `tests/income.test.js` covers the tax brackets, the R99,000 threshold and the tax-year filter. It also covers auth, public-admin rejection, JWT failure cases, roles, ownership, protected update fields, private lists, booking/transaction/income flow, historic prices and transaction-write cleanup. It does not prove MongoDB persistence.

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

In-text citations in the code comments and this README use IIE Harvard author-date style. The full list is in `REFERENCES.md` and repeated below. The supplied PoE brief (IIE, 2026b), Part 2 pages 5–6 and marking rubric pages 12–14, controls this implementation scope; the HTTPS-only API and JWT authentication carry forward from Part 1 (IIE, 2026a).

Cooper, D., Santesson, S., Farrell, S., Boeyen, S., Housley, R. and Polk, W., 2008. RFC 5280: Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile. [online] Internet Engineering Task Force (IETF). Available at: https://www.rfc-editor.org/info/rfc5280 [Accessed 9 October 2026].

Jones, M., Bradley, J. and Sakimura, N., 2015. RFC 7519: JSON Web Token (JWT). [online] Internet Engineering Task Force (IETF). Available at: https://www.rfc-editor.org/info/rfc7519 [Accessed 10 August 2026].

Let's Encrypt, n.d. Getting Started. [online] Available at: https://letsencrypt.org/getting-started/ [Accessed 9 October 2026].

Microsoft, n.d. certutil. [online] Microsoft Learn. Available at: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil [Accessed 9 October 2026].

MongoDB, Inc., n.d. MERN Stack Explained. [online] Available at: https://www.mongodb.com/resources/languages/mern-stack [Accessed 10 August 2026].

Mozilla, 2026a. Transport Layer Security (TLS). [online] MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security [Accessed 10 August 2026].

Mozilla, 2026b. Content-Security-Policy (CSP) header. [online] MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP [Accessed 5 October 2026].

nginx, n.d. Configuring HTTPS servers. [online] Available at: https://nginx.org/en/docs/http/configuring_https_servers.html [Accessed 9 October 2026].

Node.js Foundation, n.d. Node.js Documentation. [online] Available at: https://nodejs.org/en/docs [Accessed 10 August 2026].

OpenSSL Project, n.d. openssl-req - OpenSSL Documentation. [online] Available at: https://docs.openssl.org/3.0/man1/openssl-req/ [Accessed 9 October 2026].

OWASP, 2021. OWASP Top 10:2021. [online] Available at: https://owasp.org/Top10/2021/ [Accessed 10 August 2026].

OWASP, 2024a. Password Storage Cheat Sheet. [online] OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html [Accessed 10 August 2026].

OWASP, 2024b. Input Validation Cheat Sheet. [online] OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html [Accessed 10 August 2026].

Postman, n.d. Postman Learning Center. [online] Available at: https://learning.postman.com/ [Accessed 10 August 2026].

React, n.d. React Documentation. [online] Available at: https://react.dev/ [Accessed 5 October 2026].

Saint-Andre, P. and Salz, R., 2023. RFC 9525: Service Identity in TLS. [online] Internet Engineering Task Force (IETF). Available at: https://www.rfc-editor.org/info/rfc9525 [Accessed 9 October 2026].

South African Revenue Service (SARS), 2026. Rates of Tax for Individuals. [online] Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ [Accessed 9 October 2026].

Testing Library, n.d. React Testing Library. [online] Available at: https://testing-library.com/docs/react-testing-library/intro/ [Accessed 9 October 2026].

The Independent Institute of Education (IIE), 2026a. INSY7314 Portfolio of Evidence Part 1: Secure Foundations - HustleHub+. Module brief. Johannesburg: The Independent Institute of Education.

The Independent Institute of Education (IIE), 2026b. INSY7314 Portfolio of Evidence Part 2: Secure Stack - HustleHub+. Module brief. Johannesburg: The Independent Institute of Education.

Valsorda, F., n.d. mkcert: A simple zero-config tool to make locally trusted development certificates. [online] GitHub. Available at: https://github.com/FiloSottile/mkcert [Accessed 9 October 2026].

Vite, n.d. Server Options. [online] Available at: https://vite.dev/config/server-options.html [Accessed 9 October 2026].

Vitest, n.d. Getting Started. [online] Available at: https://vitest.dev/guide/ [Accessed 9 October 2026].
