# Verification of the fixed package

Checked on 5 October 2026 with Node 24.19.0.

| Check | Observed result | Scope |
| --- | --- | --- |
| Backend Jest/Supertest | 27 passed, 0 failed | Test-only memory repositories; includes failed-write cleanup and security cases |
| Frontend Vitest | 18 passed, 0 failed | Rendering/interactions/session handling with mocked HTTP |
| Frontend production build | Passed | Vite generated the built React app |
| Live Newman | 56 HTTP requests; 65 assertions passed, 0 failed | 38-request collection with repeated limit probes; real isolated MongoDB 7.0.24, Mongoose and local HTTPS |
| API process restart | Passed | Freelancer income remained R1750 after stopping and restarting the API; the existing JWT still accessed the persisted account |
| Served React HTML CSP | Passed | Built index document served from HTTPS backend with CSP |

The safe live-run summary is in verification/newman-summary.json. It excludes tokens and response bodies. An ephemeral, real mongod process backed the live run; this was not the test-only memory repository. Bcrypt factor 4 was used in that isolated live-check environment for speed; the supplied normal default remains 12.

These checks were run on the fixed source package in this workspace, not on Blake's Windows checkout, Atlas deployment or a teammate's branch. The tests do not replace a manual browser walkthrough, mobile-width layout review or checks against the team's chosen MongoDB environment. Docker was not executed.

The component tests exercise the React screens and the API tests exercise the server. No full browser-driven end-to-end run is claimed. Older screenshots in docs/screenshots came from the supplied ZIP and are not evidence of this update.
