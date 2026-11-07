# Static Code Analysis — HustleHub+ Final PoE

Static analysis examines source code and dependency files **without running the program**, so risky patterns are found before they reach users (ESLint, n.d.). The pipeline in `.github/workflows/ci.yml` is configured to run it on the agreed branches and pull requests. The restored workflow declares Bash/pipefail so an upstream scan failure cannot be hidden by `tee`. The latest reviewed GitHub run is **CI 30**, branch `blake`, commit [`7ef0cc1`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/7ef0cc1), on 7 November 2026. Its supplied artifacts are preserved in [the current run review](evidence/ci-30-7ef0cc1/REVIEW.md).

## Current application result: CI 30

The scoped fixes were subsequently confirmed in **[CI 30](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/actions/runs/42380128711)**, application commit [`7ef0cc1`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/7ef0cc1). Both linters report zero active errors/warnings, both production audits report zero, and frontend full audit reports zero. Backend full audit is **12 dev-tool entries: 6 low, 1 moderate, 5 high, zero critical**. Repository/image reports show zero displayed findings at their configured filters. [Current raw reports and interpretation](evidence/ci-30-7ef0cc1/REVIEW.md). CI 24 and local-maintenance sections below remain historical checkpoints.

## 1. Tools and what each one covers

| Tool | Runs on | Command | Gate |
| --- | --- | --- | --- |
| ESLint 9 with `eslint-plugin-security` | Backend source, scripts and tests | `cd backend && npm run lint` | Any error **or warning** fails (`--max-warnings 0`) |
| ESLint 9 with React, React Hooks and `eslint-plugin-security` | Frontend source | `cd frontend && npm run lint` | Any error or warning fails |
| Trivy | Repository files (vulnerabilities, secrets, Dockerfile misconfiguration) and both Docker images | `repo-scan` and `stack` jobs in CI | Fixable HIGH/CRITICAL in the repository; fixable CRITICAL in images |
| `npm audit` | Production dependencies of both apps | `npm run audit` | HIGH or CRITICAL fails |

Rule sets: ESLint `recommended`; `eslint-plugin-security` `recommended` (unsafe regular expressions, `eval`, non-literal file paths, object-injection sinks, child-process use, timing-attack comparisons) (eslint-community, n.d.); React `recommended` including `react/no-danger`; React Hooks rules.

## 2. Results

### 2.1 ESLint — first run on the Part 3 code base

| Project | Errors | Warnings |
| --- | ---: | ---: |
| Backend | 0 | **30** |
| Frontend | **1** | 0 |

Backend warnings by rule:

| Rule | Count | Where |
| --- | ---: | --- |
| `security/detect-non-literal-fs-filename` | 12 | `server.js` (5), `eventLogger.js` (5), `generateCert.js` (1), one test |
| `security/detect-object-injection` | 7 | `eventLogger.js` (5), `env.js` (1), one test |
| `security/detect-unsafe-regex` | 1 | `validators.js` |
| Unused `eslint-disable` directives | 10 | `server.js`, `eventLogger.js`, `errorHandler.js`, `cloudLogger.js`, `env.js` |

Frontend error: `react/no-unescaped-entities` in `LoginPage.jsx` (a raw apostrophe in JSX text).

### 2.2 ESLint — dated local review, 7 November 2026

| Project | Errors | Warnings | Evidence |
| --- | ---: | ---: | --- |
| Backend | **0** | **0** | [Saved backend result](evidence/review-2026-11-07/eslint-backend.txt) |
| Frontend | **0** | **0** | [Saved frontend result](evidence/review-2026-11-07/eslint-frontend.txt) |

### 2.3 GitHub CI 24 results, 7 November 2026

| Check | Observed result |
| --- | --- |
| Backend ESLint | **0 errors, 0 warnings**, 47 file entries; 12 targeted suppressed messages retained for review |
| Frontend ESLint | **0 errors, 0 warnings**, 40 file entries; no suppressed messages |
| Production npm audits | **0 reported vulnerabilities** in both apps |
| Frontend full npm audit | **0 reported vulnerabilities**, including development tools |
| Backend full npm audit | **27 affected dev-tool package entries:** 6 low, 8 moderate, 12 high, 1 critical |
| Trivy repository and both images | **0 displayed findings at the configured severity/fix filters** |

See the [actual reports and interpretation](evidence/ci-24-dbde7d2/REVIEW.md). These results belong to application commit `dbde7d2`; earlier local output below remains historical.

### 2.4 Earlier npm audit results

| Scope | Before | After |
| --- | --- | --- |
| Backend, production dependencies | **3** vulnerabilities (1 high: `body-parser`, GHSA-27r3-jxmh-p828; 2 moderate: `qs` GHSA-6pq8-jhm2-2vcw, `ip-address` GHSA-rxp7-6hxx-x8q5) | **0** |
| Frontend, production dependencies | 0 | **0** |

Production audits were rerun in the audit workspace on 7 November 2026: [backend](evidence/review-2026-11-07/npm-audit-backend.txt), [frontend](evidence/review-2026-11-07/npm-audit-frontend.txt), both reporting zero vulnerabilities. Earlier output remains historical. This does not cover development tools or container images.

## 3. What each result indicated, and the fix

| Finding | What it indicated | Resolution |
| --- | --- | --- |
| `detect-unsafe-regex` (`validators.js`) | The ID check `/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i` repeats a group. Some such patterns cause catastrophic backtracking, which lets one crafted string stall the server (ReDoS) | **Fixed.** Written as four explicit fixed-length groups. It accepts exactly the same strings and has no repetition on a group. All tests still pass |
| `detect-object-injection` (`eventLogger.js`, 5) | Code of the form `result[key] = value` or `TABLE[name]` with a key that is not a literal can let a key such as `__proto__` or `constructor` alter an object's prototype or return an inherited value | **Fixed.** The event-category table is a `Map`; the redaction step builds its output with `Object.fromEntries`, which creates plain own properties. A test confirms that sensitive fields are still redacted |
| `detect-object-injection` (`env.js`) | `process.env[key]` in the start-up check for required settings | **Reviewed, false positive.** The keys come from a fixed array in the same file. A single-line `eslint-disable-next-line` explains this |
| `detect-non-literal-fs-filename` (11 in shipped code) | File functions called with a variable path. This is dangerous only if an attacker controls the path (path traversal) | **Reviewed, false positive.** Paths come from operator-set settings (`LOG_DIR`, `SSL_KEY_PATH`, `SSL_CERT_PATH`) or fixed names inside the repository, never from a request. Each file carries a file-level directive that states this reason |
| Warnings in `tests/` | The same rules fire on test fixtures that are never shipped | The two rules are switched off for `tests/` in `eslint.config.js`, with the reason beside the setting |
| Unused `eslint-disable` comments | Left behind when code changed | Removed |
| `react/no-unescaped-entities` | A raw `'` in JSX text can hide typing mistakes and is rejected by the React rules | **Fixed** with `&apos;` |
| `npm audit`: `body-parser` (high), `qs`, `ip-address` | Known denial-of-service weaknesses in packages that Express depends on | **Fixed.** `npm audit fix` raised them to patched versions within the allowed ranges. Lock file updated; all backend tests pass |

The configured pipeline rejects warnings. CI 24 passed these checks; its actual lint/audit/Trivy reports are linked above. The remaining backend development-tool advisories are recorded below rather than labelled fixed.

## 4. Development-tool findings and scope

The full backend audit from CI 24 reports **27 affected development-tool package entries**, including **one CRITICAL entry for Handlebars** in the Postman/Newman chain. All affected nodes are marked development-only in the backend lockfile and excluded from the production image by `npm ci --omit=dev`. The current production audit reports zero. Frontend full audit also reports zero.

The [run review](evidence/ci-24-dbde7d2/REVIEW.md#development-tool-risk-review) lists every affected package, exact severity counts, tool exposure and follow-up. Newman/Postman accounts for 19 entries, Jest for 6 low entries, and nodemon for 2 moderate entries. The nodemon chain has a compatible fix reported available. npm proposes major downgrades of Newman/Jest for other chains; these require dependency review and retesting, not a blind `npm audit fix --force`.

The existing Newman risk treatment is to exclude it from production, run only the checked-in trusted collection against an isolated stack, and publish the full audit report. The remaining advisories remain **unresolved tooling findings**. Scope isolation is a mitigation, not a fix or proof of non-exploitability. A subsequent scoped dependency-maintenance candidate applies the updates described below; CI 24 remains the earlier result. The rubric's highest security-analysis band cannot be guaranteed while these findings remain.

### 4.1 Subsequent scoped dependency maintenance

The locally tested maintenance candidate selects patched Newman/nodemon dependencies with explicit scoped npm overrides. It reduces the full backend audit from **27 to 12 affected dev-tool package entries**, removes the critical entry and leaves **6 LOW, 1 MODERATE, 5 HIGH, 0 CRITICAL**. Production package versions are unchanged and the production audit reports zero. All 127 backend tests and the real HTTPS/MongoDB Newman collection (67 requests, 90 assertions) passed. Its subsequent GitHub verification is CI 30; the dated local outputs remain linked below.

The remaining entries derive from Faker, csv-parse and deepmerge in trusted development/test tooling. These are reviewed residual risks with bounded input/exposure, not fixed findings. See the [tooling dependency review and actual local reports](TOOLING_DEPENDENCY_REVIEW.md) for versions, compatibility checks and the reasons a further automatic override was not used. Historical CI 24 counts/reports above remain unchanged.

## 5. CI 30 scan outcomes and CodeQL limitation

| Check | Observed result | Evidence |
| --- | --- | --- |
| ESLint backend/frontend | Pass; 0 active errors/warnings | [Backend JSON](evidence/ci-30-7ef0cc1/backend/eslint-report.json), [frontend JSON](evidence/ci-30-7ef0cc1/frontend/eslint-report.json) |
| Trivy repository | Pass; displayed counts 0 at configured filters | [Report](evidence/ci-30-7ef0cc1/trivy/trivy-repo.txt) |
| Trivy backend image | Pass; no fixable HIGH/CRITICAL findings displayed | [Report](evidence/ci-30-7ef0cc1/trivy/trivy-backend-image.txt) |
| Trivy frontend image | Pass; no fixable HIGH/CRITICAL findings displayed | [Report](evidence/ci-30-7ef0cc1/trivy/trivy-frontend-image.txt) |
| CodeQL | Not active; not a passed scan | [CI repair explanation](CI_REPAIR.md) |

Trivy's commands use `--ignore-unfixed`. Repository analysis selects HIGH/CRITICAL; image reports list HIGH/CRITICAL and the image failure gate blocks fixable CRITICAL. These reports are not an all-severity, all-unfixed-vulnerabilities or Git-history scan.

CodeQL upload failed in run 18 because the private Classroom repository lacked the required Code Security/Advanced Security feature. The unsupported job was explicitly removed, without changing repository visibility or weakening the other gates. ESLint with security rules is the source-analysis tool used for this submission; Trivy/npm audit have the scopes described above. There is no claim of zero CodeQL alerts or identical coverage to CodeQL.

## 6. Re-running locally

```bash
cd backend  && npm ci && npm run lint && npm run audit
cd frontend && npm ci && npm run lint && npm run audit
```

## References

ESLint, n.d. ESLint Documentation. [online] Available at: https://eslint.org/docs/latest/ [Accessed 30 October 2026].

eslint-community, n.d. eslint-plugin-security. [online] GitHub. Available at: https://github.com/eslint-community/eslint-plugin-security [Accessed 30 October 2026].

GitHub, n.d.c. About Code Scanning with CodeQL. [online] GitHub Docs. Available at: https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql [Accessed 30 October 2026].

npm, n.d. npm-audit. [online] npm Docs. Available at: https://docs.npmjs.com/cli/commands/npm-audit [Accessed 30 October 2026].

Aqua Security, n.d. Trivy Documentation. [online] Available at: https://trivy.dev/ [Accessed 30 October 2026].
