# HustleHub+ - Part 2

Freelancers offer services, and clients browse and book them.

## Project layout
- `server/`: Part 1 authentication and security foundation.
- `client/`: React starter with fictional sample data.
- `docs/part2/`: team responsibilities, API drafts and testing instructions.

## Frontend setup
From `client`, run `npm.cmd ci`, then `npm.cmd run dev`.
Run `npm.cmd test` for tests and `npm.cmd run build` for the production build.

## Backend setup
From `server`, run `npm.cmd ci`.
Copy `.env.example` to `.env` and set a strong JWT secret.
Generate local HTTPS certificates with `npm.cmd run gen-cert` (requires OpenSSL).
Start with `npm.cmd start`.

## Current status
The React starter runs independently using sample data.
MongoDB, real marketplace APIs, frontend authentication and integration remain to be completed.
The inherited backend uses in-memory users and needs controlled admin registration.
Its test command is a placeholder; live backend tests must still be implemented.

See `docs/part2/START_HERE.md` and `TEAM_TASKS.md` for the agreed plan.
