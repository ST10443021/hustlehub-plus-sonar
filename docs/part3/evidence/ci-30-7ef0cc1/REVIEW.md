# Reviewed application evidence: CI 30

Application version: [`7ef0cc1`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/7ef0cc1), branch `blake`, 7 November 2026. **[Successful GitHub Actions run 30](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/actions/runs/42380128711)**. This is the latest supplied application run reviewed for Pillars 1-7 and the README update. A later documentation commit or final merge has its own run; this report does not invent its status.

| Check | Actual supplied result | Evidence |
| --- | --- | --- |
| Backend Jest/Supertest | 127 tests, 8 suites passed; test repositories/mock cloud HTTP | [Summary](backend/tests-summary.txt) |
| Frontend Vitest/RTL | 63 tests, 13 files passed; mocked API components | [Summary](frontend/tests-summary.txt) |
| Playwright browser integration | 2 tests passed, no skipped/failed/error cases; real UI through the container stack | [JUnit](browser/browser-junit.xml); [HTML report](browser/index.html) |
| Live Postman/Newman | 67 requests, 90 assertions, zero failures; isolated Docker/MongoDB with seeded admin checks | [Safe summary](stack/newman-summary.json); [JUnit](stack/newman-junit.xml) |
| Backend ESLint | 47 file entries; zero active errors/warnings | [JSON](backend/eslint-report.json) |
| Frontend ESLint | 40 file entries; zero active errors/warnings | [JSON](frontend/eslint-report.json) |
| Backend production audit | Zero reported vulnerabilities | [Output](backend/npm-audit-production.txt) |
| Frontend production/full audits | Zero reported vulnerabilities in both scopes | [Production](frontend/npm-audit-production.txt); [full JSON](frontend/npm-audit-full.json) |
| Backend full audit | 12 affected dev-tool package entries: 6 LOW, 1 MODERATE, 5 HIGH, 0 CRITICAL | [JSON](backend/npm-audit-full.json) |
| Frontend production build | Passed | [Build output](frontend/frontend-build.txt) |
| Trivy repository and images | Every displayed finding count is 0 at the configured severity/fix filters | [Repository](trivy/trivy-repo.txt); [backend image](trivy/trivy-backend-image.txt); [frontend image](trivy/trivy-frontend-image.txt) |
| CI containers | Backend, frontend and MongoDB healthy | [Status](stack/compose-ps.txt) |
| CI event logging | Required event types present; example booking/transaction request IDs match | [Selected-field summary](stack/event-correlation-summary.json) |
| Local Docker rebuild/login | Both images built; all services healthy; successful login confirmed by Blake | [Selected local output](local-docker-verification.txt) |
| Current Azure delivery | Fresh successful/failed login and logout rows with levels/request IDs | [Observation record](azure-delivery-verification.md) |

To open the browser report interactively, download `browser/index.html` and open it locally; GitHub's normal file view may show the HTML source. The raw JUnit also exposes the two outcomes without running a report server.

## Security feature evidence

The supplied Newman JUnit includes account lockout after five failed passwords (correct password then receives 429, lock message and Retry-After), token validity before logout (200), successful logout (200), rejection of the same old token (401), role/ownership failures, rejected public-admin signup, private income scoping and admin checks. The earlier screenshots in `docs/part3/screenshots/` remain dated visual evidence. Unit tests also cover expiry/counter reset and fresh-login token behaviour; they are not a live 15-minute lock-expiry experiment.

## Result boundaries

Trivy uses HIGH/CRITICAL and `--ignore-unfixed` for these saved reports; image gating blocks fixable CRITICAL. Zero displayed counts do not cover all severities, unfixed vulnerabilities or Git history. The backend ESLint report includes 12 targeted suppressed path/fixed-key warnings with existing explanations. Backend full audit remains nonzero in development-only Newman/Jest chains. The [tooling review](../../TOOLING_DEPENDENCY_REVIEW.md) records the patched packages and the remaining Faker/csv-parse/deepmerge exposure. CodeQL is not active because of the documented private-Classroom entitlement limitation; no clean CodeQL result is claimed.

Report copies are byte-identical to the five supplied archives except the explicitly labelled extracted test/event summaries. Raw application console logs and portal screenshots are not included. [Provenance](PROVENANCE.json) records source and report hashes. The archived reports remain evidence of this dated application version, not a guarantee about future code, dependencies or public deployment.
