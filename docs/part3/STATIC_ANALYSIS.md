# Static analysis, dependency and secret scanning

Every check below runs in the GitHub Actions pipeline (`.github/workflows/ci.yml`) on each push and pull request. A finding in any required check fails the job, and the `pipeline-passed` job then fails the whole workflow (IIE, 2026c; GitHub, n.d.d).

## What runs where

| Tool | Looks for | Pipeline job | Fails the build when |
| --- | --- | --- | --- |
| ESLint with `eslint-plugin-security` (backend and frontend) | Unsafe patterns: object-injection sinks, non-literal file paths, unsafe regular expressions, `eval`; React and hooks mistakes (frontend) | `backend`, `frontend` | Any warning or error (`--max-warnings 0`) (ESLint, n.d.) |
| `npm audit --omit=dev --audit-level=high` | Known vulnerabilities in production dependencies | `backend`, `frontend` | A HIGH or CRITICAL advisory exists |
| SonarQube / SonarCloud | Bugs, vulnerabilities, security hot-spots, code smells, duplication, coverage | `static-analysis` | The quality gate fails (`sonar.qualitygate.wait=true`) (SonarSource, n.d.) |
| CodeQL (`security-extended` queries) | Injection, XSS, path traversal, insecure randomness and similar | `codeql` (public repositories) | A code-scanning alert is raised (GitHub, n.d.c) |
| Gitleaks | Secrets committed anywhere in the git history | `repo-scan` | A secret is found (Gitleaks, n.d.) |
| Trivy, repository scan | Vulnerable packages, committed secrets, Dockerfile misconfiguration | `repo-scan` | A fixable HIGH or CRITICAL finding exists (Aqua Security, n.d.) |
| Trivy, image scan | Vulnerabilities in the built backend and frontend images | `stack` | A fixable CRITICAL finding exists |
| Dependabot | Outdated dependencies, GitHub Actions and base images | Weekly pull requests | Not a gate: updates arrive as pull requests that run this same pipeline (GitHub, n.d.b) |

## Results (ESLint, audit and coverage: 8 November 2026; Gitleaks and Trivy: 7 November 2026)

| Check | Result | Evidence |
| --- | --- | --- |
| Backend ESLint (`--max-warnings 0`) | 0 problems | `docs/part3/evidence/backend-lint.txt` |
| Frontend ESLint (`--max-warnings 0`) | 0 problems | `docs/part3/evidence/frontend-lint.txt` |
| `npm audit`, backend and frontend, production | 0 vulnerabilities | `docs/part3/evidence/npm-audit.txt` |
| Gitleaks over the whole git history | No leaks found | `docs/part3/evidence/gitleaks-local.txt` |
| Trivy secrets and misconfiguration scan | 0 findings; both Dockerfiles clean | `docs/part3/evidence/trivy-repo-local.txt` |
| Coverage (feeds SonarQube) | Backend 84% of lines, frontend 89% of lines | `docs/part3/evidence/coverage-summary.txt` |
| SonarQube / SonarCloud quality gate | Required: the pipeline fails if Sonar is not configured (below). The gate result is shown in the dashboard screenshot | Pipeline run log and `sonar-dashboard.png` |
| CodeQL | Runs on public repositories | Repository Security tab |

**SonarCloud result at the final analysis (9 November 2026):** the quality gate **passed** (all conditions passed), **0 issues** overall, security rating **A**, **0 security issues**, coverage **80.7%** and duplication **0.0%** (`sonar-dashboard.png`). An earlier analysis had listed 10 issues; none were security issues and none failed the quality gate: 8 were the style rule "Prefer `Number.parseInt` over `parseInt`" (`env.js`, `userRepository.js`, `adminService.js`) and 2 were regular-expression backtracking warnings (`eventLogger.js` line 57 and `validation.js` line 2). All 10 were fixed (see the fixes table), and the final analysis above confirms that none remain.

### What the results mean

- **ESLint is clean with the security plugin enabled**, so the code contains none of the patterns the plugin treats as dangerous. Four suppressions exist in total, each with a written reason in the source: three `detect-non-literal-fs-filename` suppressions (`server.js`, `eventLogger.js`, `generateCert.js`) where every path is built from operator-set environment values and a fixed file name, never from request data, and one `detect-object-injection` suppression in `env.js` where keys come from a fixed list. None can be reached with user input.
- **`npm audit` reports 0 production vulnerabilities**, so no known-vulnerable package ships in either application. Development-only packages are excluded on purpose because they never reach the containers.
- **Gitleaks and Trivy found no secrets.** The `.env` files, private keys and certificates are git-ignored, and the pipeline generates throw-away secrets for each run.
- **Trivy found no Dockerfile problems.** Both images build in stages, run as a non-root user and define health checks.

## Fixes and hardening applied (analysis and review findings)

| Finding | Fix |
| --- | --- |
| Non-literal file paths flagged by `eslint-plugin-security` | Paths come only from environment settings and fixed names; the suppression comments state this, and no request data reaches a file path. |
| Child-process arguments in `trustCert.js` | `execFileSync` with an argument array and no shell, so values cannot be injected as commands. |
| Missing HIGH-severity audit gate | `npm run audit` now fails the build on HIGH or CRITICAL advisories. |
| Secrets could reach the repository by accident | Gitleaks scans history on every run, and `.gitignore` excludes `.env`, `*.pem` and logs. |
| Docker Compose published MongoDB and ran it without authentication | MongoDB now requires a password and is no longer published to the host (see README, Docker). |
| Reported findings could be hidden by a pipe in a CI step | Scan steps run with `shell: bash` (which enables `pipefail`), so a failing scanner always fails the step. |
| The local CA private key was written into the API image at build time | No key is created at build time. `docker-entrypoint.sh` generates a throw-away certificate at start-up only when none is mounted, and deletes the CA key straight after signing. `hardening.test.js` fails if a build step creates keys again, and the Trivy secret scan covers the image. |
| Sonar was skipped silently when its token was missing, so the pipeline could be green without static analysis | The `static-analysis` job now fails unless `SONAR_TOKEN` and `SONAR_ORGANIZATION` are set. Only Dependabot and fork pull requests, which GitHub gives no secrets, skip it. |
| User enumeration (429 for locked real accounts but 401 for unknown emails; unknown emails skipped bcrypt; the token middleware revealed deleted accounts) | Unknown emails follow the same lockout, a dummy bcrypt comparison equalises timing, and every token failure returns "Invalid or expired token." Tested in `hardening.test.js`. |
| Raw email addresses in the event log (POPIA) | Any email field is stored as `emailHash`, a keyed HMAC-SHA-256 truncated to 16 hex characters. |
| Unmaintained `xss-clean` package, which also altered passwords containing `<` | Replaced by `sanitizeInput.js`; React's text rendering and the CSP are documented as the real XSS controls. |
| Sonar: 8 × "Prefer `Number.parseInt` over `parseInt`" | Every `parseInt(x, 10)` in `env.js`, `userRepository.js` and `adminService.js` now calls `Number.parseInt(x, 10)`. Behaviour is identical; the call is the same function on the `Number` namespace. |
| Sonar: 2 × regular expression with super-linear backtracking (ReDoS risk) | `validation.js`: the email pattern is now `^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$`, where the dot is excluded from the domain classes so each character can match only one way. `eventLogger.js`: the connection-string mask is now `/:\/\/[^/@\s:]+:[^/@\s]+@/g`, which excludes the colon from the user part and no longer starts a scan at every word character. A 200,000-character hostile input is masked in under 1 ms. |
| Tax card labelled "Estimated Annual Tax" although it covers income received so far | Renamed "Tax So Far This Tax Year" (`estimatedTaxToDate`) with an explanatory hint and method step. |

## Enabling SonarQube or SonarCloud

1. Create a free project at SonarCloud (or use a SonarQube server) and note the project key `hustlehub-plus` (set in `sonar-project.properties`).
   SonarCloud project keys are unique across all of SonarCloud, so `hustlehub-plus` may be refused. Use the key SonarCloud generates and set it as the repository variable `SONAR_PROJECT_KEY`; it overrides `sonar-project.properties`. In SonarCloud turn **Automatic Analysis off** for the project, because it cannot be combined with the pipeline scan.
2. In the GitHub repository open **Settings, Secrets and variables, Actions** and add the secret `SONAR_TOKEN` and the variable `SONAR_ORGANIZATION`. For a self-hosted server also add `SONAR_HOST_URL`.
3. Push. The `static-analysis` job downloads the coverage reports from the `backend` and `frontend` jobs and runs the scan with the quality gate. **If the token or organisation is missing, the job fails and so does the whole pipeline** (only Dependabot and fork pull requests, which get no secrets, skip it), so a green run always includes the Sonar result.
4. Screenshot the project dashboard (quality gate, bugs, vulnerabilities, hot-spots, coverage) as `sonar-dashboard.png`, and record any issue it reports with the fix in the table above.

## Sonar Quality Gate Log and Incidents

| Date / Commit | Issue Reported | Root Cause | Fix / Resolution | Result |
| --- | --- | --- | --- | --- |
| Commit `5e4a270` | Quality gate failure: 74.2% duplication on new code and a C reliability rating. | A single generated file (`docs/part3/ci-evidence/e2e/playwright-report/index.html` with 46 duplicated lines and missing `lang` attribute) was accidentally committed as CI evidence. It is machine-generated test output, not application source code. | Removed the file from version control and added its folder to `.gitignore`. The report remains available inside the CI `stack-evidence` artifact and as `playwright-report.png`. | Gate passes successfully on the next analysis run. |

If the repository sits in an organisation that blocks the SonarCloud app, fork the repository, connect Sonar to the fork and link the fork in the README, as the brief allows.