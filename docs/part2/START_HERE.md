# Part 2 AI starter â€” start here

This package adds the agreed AI foundations to the uploaded Part 1 project. It is **not a completed Part 2 submission**.

## Run the frontend starter

1. Clone the Part 2 repository and open its project folder.
2. Open a terminal inside `client`.
3. Use a current Node.js 22 LTS installation (22.12 or newer), or Node.js 24 LTS.
4. Run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:5173`). `npm.cmd` also avoids the PowerShell script-policy issue; in Bash use `npm`.

Choose a sample user in the top-right corner. Morgan and Casey are clients; Alex and Jamie are freelancers. Try browsing, booking, adding/editing/deleting services, and viewing received bookings and sample income. The records reset on a page reload.

```powershell
npm.cmd test
npm.cmd run build
```

The frontend does not need MongoDB or the Part 1 backend to run in sample-data mode.

## What AI added

| Folder/file | Purpose |
| --- | --- |
| `client/src/pages/connor` | Browse services, booking confirmation, and the client booking list. |
| `client/src/pages/muzzi` | My services, add/edit form, delete confirmation usage, and received bookings. |
| `client/src/components` | Reusable cards, booking lists, messages, loading/empty/error states, and delete dialog. |
| `client/src/pages/shared/IncomePreview.jsx` | Starter income layout for Blake/Hamza. |
| `client/src/data/fixtures.js` | Fictional sample users, services, bookings, and transactions. No real accounts. |
| `client/src/services/mockApi.js` | An in-memory UI simulation so team members can work in parallel. |
| `client/src/services/httpApi.js` | A draft real-API adapter. It is not connected to the demo app. |
| `client/src/test` | Executable starter component and adapter tests. |
| `docs/part2` | Team ownership, draft routes/data, documentation drafts, test checklist, and Postman starter. |

## What Blake and Hamza must complete

- Confirm the draft fields and routes before Connor/Muzzi depend on them.
- Add MongoDB, update synchronous user lookups to asynchronous calls, and save all marketplace records.
- Add the real signup/login screens and session handling. The sample-user picker is **not authentication**.
- Connect the real API adapter to an authenticated shell. Remove the sample-user picker and sample-data banner in that real shell; do not simply inject a real API into the demo shell and call it a secure app.
- Enforce roles and record ownership on the **server**, not just through navigation buttons.
- Create booking/transaction records together, choose prices from saved services, and calculate each freelancer's income on the server.
- Configure frontend/API CORS and CSP for the real app; extend validation and request limits to new routes.
- Finish and run the live Postman/Newman suite and frontend tests. Mock tests are not evidence of backend security.
- Own the final README, screenshots, demo video, integration, and merges.

## Issues carried over from the uploaded Part 1 copy

The archive preserved the original Part 1 files. The Part 2 repository uses the working backend in `server/`:

1. The working Part 1 backend has been imported into `server/`. Run its commands from that folder.
2. The repository now has a clean root README. Blake/Hamza must update it as real Part 2 features and test evidence are completed.
3. Public registration accepts `admin` in the current backend. Restrict signup to client/freelancer; create admins through a controlled process.
4. `requireRole` exists but is not applied to marketplace routes because those routes do not yet exist.
5. The nested backend's `npm test` is a placeholder. The new `client` tests run separately and do not replace backend/Newman testing.

## Repository workflow

The initial foundation was imported directly onto `main` in four meaningful commits. Team members should now use their own branches and have Blake/Hamza review changes before merging. Keep local credentials, certificates, dependencies and build outputs out of Git.

The PoE requires real features, test evidence, an updated README, screenshots and a demo, plus meaningful commit history and teamwork. Part 3 tax, Docker and CI/CD work is outside this starter.

References for the tooling setup: [Vite guide](https://vite.dev/guide/) and [Vitest environments](https://vitest.dev/guide/environment.html). The project requirements come from the supplied `PoE Instructions.pdf`.

