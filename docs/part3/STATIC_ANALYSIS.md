# Static Code Analysis — HustleHub+ Final PoE

Static analysis examines source code and dependency files **without running the program**, so risky patterns are found before they reach users (ESLint, n.d.). The pipeline in `.github/workflows/ci.yml` runs it on every push and pull request, and fails the build when a tool reports a problem.

## 1. Tools and what each one covers

| Tool | Runs on | Command | Gate |
| --- | --- | --- | --- |
| ESLint 9 with `eslint-plugin-security` | Backend source, scripts and tests | `cd backend && npm run lint` | Any error **or warning** fails (`--max-warnings 0`) |
| ESLint 9 with React, React Hooks and `eslint-plugin-security` | Frontend source | `cd frontend && npm run lint` | Any error or warning fails |
| CodeQL (`security-extended` queries) | Whole repository, JavaScript | `codeql` job in CI | Results appear in **Security → Code scanning** |
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

### 2.2 ESLint — final run (after fixes)

| Project | Errors | Warnings | Evidence |
| --- | ---: | ---: | --- |
| Backend | **0** | **0** | `evidence/eslint-backend.txt` |
| Frontend | **0** | **0** | `evidence/eslint-frontend.txt` |

### 2.3 npm audit

| Scope | Before | After |
| --- | --- | --- |
| Backend, production dependencies | **3** vulnerabilities (1 high: `body-parser`, GHSA-27r3-jxmh-p828; 2 moderate: `qs` GHSA-6pq8-jhm2-2vcw, `ip-address` GHSA-rxp7-6hxx-x8q5) | **0** |
| Frontend, production dependencies | 0 | **0** |

Evidence: `evidence/npm-audit.txt`.

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

The pipeline now rejects any new warning, so the clean result is protected from regression.

## 4. Accepted and documented risk

`npm audit` (the full report, including development tools) still lists advisories under **Newman** (`@faker-js/faker`, `postman-collection`, `postman-runtime` and others). The only automatic fix is `npm audit fix --force`, which would install Newman 4.6.1, an old release (a breaking change). The risk is accepted because:

1. Newman is a `devDependency`. The production image is built with `npm ci --omit=dev`, so it is not present at run time.
2. In CI it only runs our own Postman collection against a throw-away stack, with no untrusted input.
3. The pipeline gates on production dependencies and publishes the full report (`npm-audit-full.json`) as an artifact on every run.

## 5. CodeQL and Trivy results

CodeQL and Trivy run inside GitHub Actions, so their results are produced by the pipeline rather than saved in this repository:

- **CodeQL:** open the repository's **Security → Code scanning** page after the first run. Any alert should be fixed, or dismissed with a written reason, and noted here.
- **Trivy repository scan:** the `repo-scan` job prints a table and uploads `trivy-repo.txt`. A clean run means no fixable HIGH or CRITICAL vulnerabilities, no committed secrets and no HIGH Dockerfile misconfiguration.
- **Trivy image scans:** the `stack` job uploads `trivy-hustlehub_backend_local-high.txt` and the frontend equivalent. HIGH findings with a published fix are listed for information; fixable CRITICAL findings fail the job.

Record the outcome of the first green run here:

| Check | Result | Date |
| --- | --- | --- |
| CodeQL alerts open | _enter number after the first run_ | |
| Trivy repository scan | _pass / findings_ | |
| Trivy backend image (CRITICAL) | _pass / findings_ | |
| Trivy frontend image (CRITICAL) | _pass / findings_ | |

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
