# Final PoE evidence index

Updated 7 November 2026. Latest supplied application verification: [`7ef0cc1`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/7ef0cc1) on `blake`, **[successful CI 30](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/actions/runs/42380128711)**. The README update itself is a later documentation change and does not relabel that application commit or invent a newer run result.

## Current evidence

| Area | Recorded result | Location |
| --- | --- | --- |
| Backend tests | 127 passed / 8 suites; memory repositories and mocked cloud HTTP | [Summary](evidence/ci-30-7ef0cc1/backend/tests-summary.txt) |
| Frontend component tests | 63 passed / 13 files; mocked API | [Summary](evidence/ci-30-7ef0cc1/frontend/tests-summary.txt) |
| Playwright browser integration | 2 passed, zero failed/skipped/errors; real UI/API/MongoDB in CI | [JUnit](evidence/ci-30-7ef0cc1/browser/browser-junit.xml); [HTML report](evidence/ci-30-7ef0cc1/browser/index.html) |
| Live Newman | 67 requests / 90 assertions / zero failures, including admin/security cases | [Safe summary](evidence/ci-30-7ef0cc1/stack/newman-summary.json); [JUnit](evidence/ci-30-7ef0cc1/stack/newman-junit.xml) |
| ESLint/security rules | Both apps: zero active errors/warnings; targeted backend suppressions remain explained | [Backend](evidence/ci-30-7ef0cc1/backend/eslint-report.json); [frontend](evidence/ci-30-7ef0cc1/frontend/eslint-report.json); [explanation](STATIC_ANALYSIS.md) |
| Production npm audits | Zero reported vulnerabilities in both apps | [Backend](evidence/ci-30-7ef0cc1/backend/npm-audit-production.txt); [frontend](evidence/ci-30-7ef0cc1/frontend/npm-audit-production.txt) |
| Full npm audits | Frontend zero; backend 12 dev-tool entries: 6 low, 1 moderate, 5 high, zero critical | [Backend](evidence/ci-30-7ef0cc1/backend/npm-audit-full.json); [frontend](evidence/ci-30-7ef0cc1/frontend/npm-audit-full.json); [fixes/risk treatment](TOOLING_DEPENDENCY_REVIEW.md) |
| Trivy | Displayed counts zero at configured filters | [Repository](evidence/ci-30-7ef0cc1/trivy/trivy-repo.txt); [backend image](evidence/ci-30-7ef0cc1/trivy/trivy-backend-image.txt); [frontend image](evidence/ci-30-7ef0cc1/trivy/trivy-frontend-image.txt) |
| Docker | Both images built; all services healthy in CI and local rebuild; local login confirmed | [CI status](evidence/ci-30-7ef0cc1/stack/compose-ps.txt); [local verification](evidence/ci-30-7ef0cc1/local-docker-verification.txt) |
| Frontend build | Passed in CI | [Output](evidence/ci-30-7ef0cc1/frontend/frontend-build.txt) |
| Structured events | Required types present; example booking/transaction IDs match | [Safe correlation summary](evidence/ci-30-7ef0cc1/stack/event-correlation-summary.json) |
| Azure delivery | Fresh login success/failure and logout rows confirmed after rebuild | [7 November observation](evidence/ci-30-7ef0cc1/azure-delivery-verification.md); earlier [Logging1](screenshots/Logging1.png), [Logging2](screenshots/Logging2.png) |
| Additional security controls | CI 30 live lockout and token-reuse rejection; earlier visual evidence retained | [Lockout](screenshots/SecurityTest2.png); [revocation sequence](screenshots/SecurityTest.png); [current JUnit](evidence/ci-30-7ef0cc1/stack/newman-junit.xml) |
| Threat/control review | Injection, XSS, authentication and access control mapped to code/tests | [README section 18](../../README.md#18-final-security-review); [supporting notes](SECURITY_REVIEW.md) |

The [current review](evidence/ci-30-7ef0cc1/REVIEW.md) explains scopes and evidence provenance. Raw application console logs and portal account headers are omitted from selected evidence. CodeQL is not active because of the documented private Classroom entitlement limitation; it is not reported as passed.

## Historical evidence retained

- [CI 24](evidence/ci-24-dbde7d2/REVIEW.md), `dbde7d2`: earlier green application run, with 27 affected backend dev-tool package entries including one critical.
- [Local tooling maintenance](TOOLING_DEPENDENCY_REVIEW.md): locally verified dependency fixes, subsequently confirmed by CI 30; raw local reports remain under `evidence/tooling-maintenance-2026-11-07/`.
- [7 November local audit](evidence/review-2026-11-07/): backend/frontend tests, lint, audits and frontend build before the later live container run.
- [October Newman output](evidence/newman-local-run.txt), [summary](evidence/newman-local-summary.json): earlier run, not relabelled as CI 30.
- [Part 2 UI screenshots](../part2/screenshots/) and [Part 1 API screenshots](../part1/screenshots/): earlier visual records.

## Final handoff

- [x] Actual CI run URL, application commit and dated results recorded.
- [x] Analysis findings, scoped fixes and remaining development-tool risks explained.
- [x] Docker local/CI execution and live Newman/browser evidence retained.
- [x] Fresh Azure authentication delivery confirmed; older booking/transaction screenshots remain dated evidence.
- [x] Existing lockout/revocation evidence retained and current live cases checked.
- [ ] Add the accessible final demonstration-video URL to README section 19 (Pillar 9).
- [ ] Keep the supplied CI/Azure/dashboard screenshots with the submission, or show those screens in the final demo. Original portal screenshots are not copied into this patch.
- [ ] Review final branch/commit, meaningful contribution history, tracked-file exclusions and the actual submitted version's CI status using [FINAL_HANDOFF.md](FINAL_HANDOFF.md).

Public hosting is optional; the README documents local Docker evaluation. Do not pad commit history or relabel older evidence as a new result.
