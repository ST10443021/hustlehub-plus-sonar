# Pillar 7: final security review record

Review date: **5 November 2026**. Repository integration/evidence update: **7 November 2026**. The final README has been restored; the required threat-to-control explanation is in [README section 18](../../README.md#18-final-security-review).

## Scope and evidence boundaries

This review used the supplied Part 3 source plus the console-redaction and Azure logging updates created in this conversation. Blake applied those updates and supplied passing backend output. The patched frontend dependency lockfile is on Blake's computer; its 4 November audit, test and build output was reviewed, but this document does not pretend that the original uploaded lockfile already contained that repair.

The reviewer cannot access Blake's Windows checkout. No final GitHub commit has been identified. Results below describe the version and actions actually observed, not an unseen future submission. No new application feature or security test is added by this documentation update.

## Required threat areas

| Threat | Explanation in simple English | Main implementation | Supporting tests |
| --- | --- | --- | --- |
| Injection | Treat the email, password, filters, IDs and prices as specific data types. Reject objects or fields that do not belong in the request instead of passing them to a database query. | `backend/src/middleware/validators.js`, `backend/src/app.js`, repositories | `backend/tests/injection.test.js`, `backend/tests/security.test.js` |
| XSS | Display user-supplied text as text. Neutralise the tested HTML payloads, disallow raw HTML rendering in lint and restrict scripts with a policy on the production HTML page. | `backend/src/app.js`, `frontend/nginx.conf`, `frontend/securityHeaders.js`, `frontend/eslint.config.js` | `injection.test.js`; `frontend/src/tests/Dashboard.test.jsx` and `Admin.test.jsx` |
| Authentication weaknesses | Hash passwords, limit login attempts, temporarily lock repeatedly attacked accounts, verify JWT signature/issuer/expiry and reject tokens after server-side logout. | `backend/src/services/authService.js`, `backend/src/middleware/authMiddleware.js`, `rateLimiters.js`, `backend/src/repositories/userRepository.js` | `security.test.js`, `securityFeatures.test.js`; live lockout and token-reuse demonstration |
| Access control | Check permission on the server for every protected operation. The user cannot become an admin through signup, edit another freelancer's gig or choose another user's booking identity and amount. | `backend/src/routes/`, `authMiddleware.js`, `backend/src/services/gigService.js`, `bookingService.js`, booking and transaction repositories | `gigManagement.test.js`, `security.test.js`, `securityFeatures.test.js` |

The full README table also covers safe errors, data exposure, configuration, dependency risks, logging, CSRF, denial of service, tampering, SSRF and image-build limits. These are specific mitigations and tested examples, not an assertion that all attacks are prevented.

## Observed results

| Evidence | What was observed | What it does not prove |
| --- | --- | --- |
| Backend checks, 5 November | Lint passed; **8 suites / 127 tests passed** after the Azure update. Includes injection, ownership, JWT, lockout, revocation, safe error, redaction and cloud delivery cases. | Test repositories are in-memory and cloud HTTP is mocked. These checks alone do not prove persistence or live Azure delivery. |
| Frontend checks, 4 November | Lint, **9 test files / 54 tests**, production build and production audit passed. | Mocked component tests do not prove all live browser attacks are blocked. |
| Production dependency audits, 4 November | Backend and frontend reported **0 vulnerabilities** for `--omit=dev`. Frontend showed `follow-redirects@1.16.2` after the repair. | Does not cover development dependencies, future advisories or container OS packages. |
| Frontend full audit, 4 November | **Six moderate affected packages** remained in the ESLint/minimatch toolchain; the proposed forced fix was a breaking plugin downgrade. ESLint also printed an unsupported-version warning. | Do not describe the full dependency tree as clean. A compatible tooling update and fresh reports remain work for Pillars 2/3/8. |
| Docker/marketplace, Pillars 1/4 | Blake confirmed healthy containers, HTTPS health endpoint and real MongoDB-backed application actions. Bookings updated the correct freelancer's income and persisted. | This does not replace a final-commit CI/Newman run. |
| Azure, Pillar 5, 5 November | Actual login success/failure, logout, booking and transaction events were queried in Application Insights. Related events shared request IDs. | Startup `cloudLogging: true` alone would not prove this. No Azure alert delivery was demonstrated. |
| Account lockout, Pillar 6, 5 November | UI showed the account-specific temporary-lock message after the prescribed failed-login sequence and correct-password attempt. | The screenshot alone does not demonstrate expiry timing or every concurrency case; the test suite covers the configured expiry path. |
| Token revocation, Pillar 6, 5 November | Original token profile **200**; logout **200**; same token profile **401**; fresh login token profile **200**. | Browser token removal alone would not prove revocation; the rejected reused token is the relevant evidence. |

## Review findings and decisions

1. **Required security controls are present and covered by relevant tests.** No new application code was needed to write the four required threat explanations.
2. **Update evidence claims.** CodeQL, Trivy and final GitHub Actions results remain pending. Old Newman output is historical evidence and is not relabelled as a run against the final MongoDB-backed Docker version. This README update separates implemented controls, observed checks and finalisation work.
3. **Record current logging accurately.** Azure delivery is now demonstrated. It is best-effort, not immutable or exactly-once storage. No alert rule has been tested. Structured-event/error redaction is covered; the Morgan access log can still include query strings, and arbitrary secrets pasted into ordinary text are not guaranteed to be detected.
4. **Keep browser-session risk explicit.** JWTs are stored in `localStorage` and can be read by injected same-origin script. CSP and text rendering reduce XSS exposure but do not make that storage inaccessible to JavaScript. If logout cannot reach the server, local session clearing does not revoke a stolen token. No cookie/CSRF redesign is included.
5. **Correct image-key claims.** `.dockerignore` keeps host credentials out of the build context, but the backend Dockerfile generates a demo CA/server key set inside the image. The review therefore does not say the image contains no keys. Public deployment would require separately managed certificates and removal of build-generated fallback keys. Current Compose mounts the host's trusted server certificate/key over the runtime paths.
6. **CI failure-propagation finding: configuration corrected on 7 November; actual GitHub run still required.** The restored workflow now uses `defaults.run.shell: bash`. The following describes the original finding: The repository Trivy step pipes its command through `tee` without explicit `pipefail` or `shell: bash`. A scanner failure can be hidden by `tee` succeeding. GitHub documents different options for the unspecified shell and explicit `bash`. Locally, `bash -e -c 'false | cat'` exited **0**, while the same pipeline with `bash -eo pipefail` exited **1**. That reproduces the shell behaviour; it is not a GitHub run or Trivy scan. Add explicit pipe-failure handling, then demonstrate that a controlled failing check makes the actual workflow fail. The final integration patch now supplies this configuration correction. It does not claim a live Trivy scan or GitHub run.
7. **Retain residual limits rather than claim production readiness.** The single MongoDB node has no backup proof; booking/transaction compensation is not atomic; rate-limit counters are in process memory; local certificate trust and demo image keys need production changes; log retention/access need management. These are recorded in README section 20.

## Save existing evidence in the project

These filenames are suggested destinations. The screenshots and terminal results were seen in the conversation; this package does not create or claim to contain those screenshots or the Windows command output.

| Suggested path | Content to save |
| --- | --- |
| `docs/part3/screenshots/azure-logging-events.png` | Azure result rows showing login, booking and transaction events with matching request IDs |
| `docs/part3/screenshots/azure-login-failure.png` | Azure rows showing `login_failed` with warning level |
| `docs/part3/screenshots/account-lockout.png` | Existing lockout UI screenshot |
| `docs/part3/evidence/token-revocation-live.txt` | The four HTTP result lines: 200, 200, 401, 200; no token or password |
| `docs/part3/evidence/backend-tests-final.txt` | Full dated backend test summary for the tested version; sanitise before saving |

Do not place connection strings, JWTs, passwords, real `.env` files or private certificates in evidence. IDs and timestamps can be retained where needed to match events; keep screenshots limited to relevant fields.

## Final repository handoff

- [x] Original Azure/security screenshots restored and linked; 7 November audit-workspace outputs are stored separately.
- [x] Configure explicit Bash/pipefail for workflow run steps.
- [ ] Retain actual GitHub failure-gate and successful final-run evidence.
- [ ] Run GitHub Actions, review CodeQL alerts and Trivy findings, and save the actual outcomes under Pillars 2/3.
- [ ] Run the final live Newman collection against isolated test data on the actual final Docker version; do not overwrite coursework/demo data or present archived results as new.
- [ ] Check tracked files and history for accidentally committed secrets. Ignore rules alone are not evidence. Record the final commit that was tested.
- [x] Final README branch name reconciled to `muzzi`; team ownership is unchanged.
- [ ] Update stale counts, audit/tooling exceptions, old Better Stack evidence instructions and missing links during Pillar 8. Preserve the observed results and dates rather than replacing them with predictions.

The original dated observations above are retained. The 7 November audit workspace additionally passed 127 backend tests, 63 frontend tests, both linters, production dependency audits and the frontend build; these are not live database/cloud/CI checks. Pillar 7's threat-to-control review is prepared. Final scan results and repository evidence are tracked separately so the review can remain honest while Pillar 2 is deferred.

## References

OWASP, n.d.i. HTML5 Security Cheat Sheet. Available at: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html [Accessed 5 November 2026].

OWASP, n.d.j. Authorization Cheat Sheet. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html [Accessed 5 November 2026].

OWASP, n.d.k. Logging Cheat Sheet. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html [Accessed 5 November 2026].

GitHub, n.d.d. Workflow syntax for GitHub Actions. Available at: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax [Accessed 5 November 2026].
