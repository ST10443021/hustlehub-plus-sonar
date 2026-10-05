# API and data contract — draft for Blake/Hamza to confirm

The auth routes below already exist. **Marketplace routes below are proposals, not implemented endpoints.** Confirm or update this document, `httpApi.js`, and the Postman draft together before frontend/backend integration.

## Shared choices proposed by this starter

- IDs are strings at the API boundary (including MongoDB IDs when added).
- Money uses positive whole-number cents and `currency: "ZAR"`; R500.00 = 50000 cents. No browser-supplied price on a booking request.
- Users retain `client`, `freelancer`, and controlled `admin` roles. Public signup must not create admins.
- The server gets the acting user's identity from a verified JWT. Browser-supplied user objects in the mock API are never trusted by the real API.
- Success: `{ "status": "success", "message": "...", "data": { ... } }`.
- Errors remain safe and structured; use 400 for invalid input, 401 for missing/invalid login, 403 for disallowed actions, 404 for missing items, 409 for conflicting records, and 429 for request limits. Blake/Hamza must decide whether ownership failures consistently return 403 or 404; the Postman draft currently accepts either for those cases.
- Delete responds with a JSON success envelope and `data: { "id": "..." }`; it does not return an empty 204 response in this draft.

## Existing Part 1 endpoints

| Method | Route | Response |
| --- | --- | --- |
| POST | `/api/auth/register` | `data.user` |
| POST | `/api/auth/login` | `data.token`, `data.user` |
| GET | `/api/auth/profile` | `data.user` after JWT verification |
| GET | `/health` | Existing health response; no data field is required there. |

## Proposed Part 2 endpoints

| Method | Route | Who / operation | Response data |
| --- | --- | --- | --- |
| GET | `/api/gigs` | Browse active services; public browsing proposed. | `{ gigs: [...] }` |
| GET | `/api/gigs/mine` | Logged-in freelancer's own services. Register this route before `/:id` if a detail route is added. | `{ gigs: [...] }` |
| POST | `/api/gigs` | Freelancer creates a service. | `{ gig: {...} }`, 201 |
| PATCH | `/api/gigs/:id` | Owning freelancer edits it. | `{ gig: {...} }`, 200 |
| DELETE | `/api/gigs/:id` | Owning freelancer removes it. | `{ id: "..." }`, 200 |
| POST | `/api/bookings` | Client books an active service. Body: `{ gigId }` only. | `{ booking: {...}, transaction: {...} }`, 201 |
| GET | `/api/bookings/mine` | Client sees their purchases; freelancer sees bookings for their services. | `{ bookings: [...] }` |
| GET | `/api/income/mine` | Freelancer sees their own recorded income. | `{ amountCents, currency, transactions: [...] }` |

Admin permissions require an explicit decision. No public admin picker, admin creation page, or extra admin dashboard is required by this starter. Preserve clear role boundaries; do not silently allow every role on every route.

## Fields used by the UI

**Gig:** `id`, `freelancerId`, `freelancerName`, `title`, `description`, `priceCents`, `category`, `active`. Category is decorative sample content; make it optional with a `Services` display fallback if the backend omits it. Creating/editing sends only `title`, `description`, `priceCents`. Freelancer identity comes from the session.

**Booking:** `id`, `gigId`, `gigTitle`, `clientId`, `clientName`, `freelancerId`, `freelancerName`, `amountCents`, `currency`, `status`, `createdAt`.

**Transaction:** `id`, `bookingId`, `clientId`, `freelancerId`, `amountCents`, `currency`, `simulated`, `createdAt`.

Names are fictional in the UI demo. The existing signup has email/password/role only; Blake/Hamza must decide whether to add a display name or project a safe label for list responses. Do not expose password hashes.

The suggested title length (3–80), description length (10–500), and price ceiling (R1,000,000) are UI starter choices, **not PoE rules**. Agree on final limits and validate them independently on the server.

## Required real-system decisions

- Update all user-model consumers to await MongoDB lookups; changing only `userModel.js` is insufficient because the existing service/middleware expects synchronous results.
- Save booking and transaction consistently (transaction/session or another tested all-or-nothing design). Prevent retries from creating accidental duplicates.
- Preserve booked title/fee history when a service is later changed or removed.
- Use server-side ownership checks on write and private read routes.
- Apply booking rate limits and safe error responses. Configure browser access explicitly for the selected frontend URL.
- Connect the adapter through a real auth shell and an agreed token lifecycle. The sample-user picker is never a substitute for this.
