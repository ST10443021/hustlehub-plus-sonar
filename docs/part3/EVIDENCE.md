# Evidence index (final PoE)

Every rubric criterion has evidence that is easy to find. Text evidence is committed under `docs/part3/evidence/` and was produced by real runs on 7 and 8 November 2026. Screenshots are saved under `docs/part3/screenshots/` after the pipeline and cloud services have run on the team's GitHub repository, because they show the team's own accounts (IIE, 2026c).

## Committed text evidence (already in the repository)

| File | What it proves | Produced by |
| --- | --- | --- |
| `evidence/backend-tests.txt` | 146 of 146 backend tests pass (9 suites) | `npm test` in `backend/` |
| `evidence/frontend-tests.txt` | 64 of 64 frontend tests pass (13 files) | `npm test` in `frontend/` |
| `evidence/frontend-build.txt` | The production build succeeds | `npm run build` in `frontend/` |
| `evidence/backend-lint.txt`, `evidence/frontend-lint.txt` | ESLint with the security plugin reports 0 problems | `npm run lint` |
| `evidence/npm-audit.txt` | 0 production vulnerabilities in both applications | `npm run audit` |
| `evidence/coverage-summary.txt` | Line coverage 84% backend, 89% frontend | `npm run test:coverage` |
| `evidence/newman-local-run.txt`, `evidence/newman-local-summary.json` | Newman: 67 HTTP requests (55 requests in the collection, with the rate-limit probes repeating), 90 assertions, 0 failures, against the API with a MongoDB-compatible database over HTTPS | `npm run test:api` in `backend/` |
| `evidence/gitleaks-local.txt` | No secrets in 80 scanned commits | Gitleaks v8.21.2 |
| `evidence/trivy-repo-local.txt` | Trivy secrets and Dockerfile checks: 0 findings | Trivy 0.76.2 |
| `evidence/logging-sample.jsonl` | Real structured log lines from the live Newman run of 8 November 2026: logins, failed logins (email stored only as `emailHash`), lockout, blocked login, token rejection, access denied, gig, booking, transaction, rate limit, admin access | The Newman run above |

Part 2 history is kept in `docs/part2/` (dated verification record and Part 2 Newman summary).

## Pipeline artifacts (download from the GitHub Actions run, then commit the useful ones)

Open the Actions run and download the artifacts at the bottom of the run page.

| Artifact | Contains |
| --- | --- |
| `stack-evidence` | `docker-compose-ps.txt` (all containers healthy), `https-health.json`, `newman-run.txt`, `container-logs.txt`, `events.log` from the container, Trivy image reports, the Playwright HTML report and the Playwright screenshots in `e2e/evidence/` |
| `backend-reports`, `frontend-reports` | lcov coverage, ESLint JSON, `npm audit` JSON |
| `repo-scan-reports` | Gitleaks and Trivy repository reports |

## Screenshots to capture

Save each file in `docs/part3/screenshots/` with exactly these names so the README links resolve.

| File | Rubric area | How to capture |
| --- | --- | --- |
| `pipeline-run-green.png` | CI/CD | Actions, latest run on `main`, all jobs green including **Pipeline passed** |
| `pipeline-run-failing.png` | CI/CD (fails on problems) | Push a throw-away branch with one deliberately failing test, capture the red run, then delete the branch |
| `playwright-report.png` | CI/CD, testing | Open `e2e/playwright-report/index.html` from the `stack-evidence` artifact (12 tests) |
| `newman-run.png` | CI/CD, API tests | The "API tests" step log of the `stack` job, or `docs/part3/evidence/newman-local-run.txt` |
| `docker-compose-ps.png` | Docker | `docker compose ps` showing mongo, backend and frontend as `healthy` |
| `docker-app-running.png` | Docker | Browser on `https://localhost:8443` served by the containers |
| `sonar-dashboard.png` | Static analysis | SonarCloud/SonarQube project overview with the quality gate |
| `logging-azure-events.png` | Logging | Azure Logs: first query in `LOGGING.md` |
| `logging-azure-chart.png` | Logging | Azure Logs: security timechart query in `LOGGING.md` |
| `dashboard-income-tax.png` | Tax and income dashboard | Freelancer dashboard with income above R99,000 (copy `e2e/evidence/05-dashboard-income-and-tax.png` from the artifact) |
| `account-lockout.png` | Own security feature | Copy `e2e/evidence/06-account-lockout.png` from the artifact |
| `admin-console.png` | Own security feature | Copy `e2e/evidence/07-admin-console.png` from the artifact |

Run `node docs/part3/check-evidence.mjs` from the repository root at any time: it lists every screenshot or file the README still links to that is missing.

## Demonstration video

Record a new video for Part 3 (the Part 2 video does not show the new features) and paste its link in the README. Suggested order: register and log in as freelancer, create a gig, log in as client, book, return as freelancer and show the dashboard income, tax, chart and tax method; show the lockout and the admin console; show the green pipeline run, `docker compose ps`, the Azure log view and the Sonar dashboard.
