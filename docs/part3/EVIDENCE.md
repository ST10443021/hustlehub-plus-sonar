# Final PoE Evidence Index

This file lists every submission item required by the Part 3 brief (IIE, 2026c), where it is, and exactly what still has to be captured from systems that only you can access (GitHub, Better Stack, your screen).

## Already in the repository

| Submission item | File or folder |
| --- | --- |
| Pipeline configuration | `.github/workflows/ci.yml`, `.github/dependabot.yml` |
| Both Dockerfiles and Compose | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` |
| Final README | `README.md` |
| Static analysis result and explanation | `docs/part3/STATIC_ANALYSIS.md`, `evidence/eslint-backend.txt`, `evidence/eslint-frontend.txt`, `evidence/npm-audit.txt` |
| Test evidence | `evidence/backend-tests.txt` (105), `evidence/frontend-tests.txt` (54), `evidence/frontend-build.txt` |
| API test evidence (Newman) | `evidence/newman-local-run.txt`, `evidence/newman-local-summary.json` |
| Logging evidence (structured events) | `evidence/logging-sample.jsonl` |
| Reference list | `REFERENCES.md` |

## To capture after the first pipeline run (screenshots)

Save each image in `docs/part3/screenshots/` with these names so the README evidence table stays accurate.

| File name | What it must show | How to get it |
| --- | --- | --- |
| `01-ci-pipeline-green.png` | All jobs green: backend, frontend, codeql, repo-scan, stack, pipeline-passed | GitHub → **Actions** → latest run |
| `02-ci-stack-containers-running.png` | The `stack` job log with `docker compose ps` (mongo, backend, frontend running/healthy) and the Newman result table | Open the `stack` job → expand "Check that all three containers are running" and "API tests" |
| `03-codeql-code-scanning.png` | **Security → Code scanning** with no open alerts (or alerts dismissed with reasons) | GitHub → **Security** |
| `04-trivy-image-scan.png` | The Trivy image scan step output for both images | `stack` job → "Image scan - Trivy" |
| `05-betterstack-live-tail.png` | Better Stack live tail showing `user_login`, `booking_created`, `transaction_created` events | Better Stack → your source → **Live tail** |
| `06-betterstack-security-events.png` | Better Stack search filtered on `category:security` showing `login_failed` / `account_locked` | Better Stack → search |
| `07-dashboard-chart.png` | Freelancer dashboard with the bar chart, bracket table and progress bar | App → `/dashboard` |
| `08-admin-console.png` | Admin console with totals, a locked account and security events | App → `/admin` |
| `09-docker-compose-ps.png` | `docker compose ps` on your machine with all services up | Terminal |

Artifacts to download from the pipeline run (Actions → run → **Artifacts**): `stack-evidence` (Newman JUnit and summary, container logs, Trivy reports), `backend-static-analysis`, `frontend-static-analysis`. Add any you want to keep under `docs/part3/evidence/`.

## Before submitting

- [ ] Pipeline is green on `main` (screenshot 01).
- [ ] CodeQL alerts reviewed (screenshot 03) and the table in `STATIC_ANALYSIS.md` section 5 filled in.
- [ ] Better Stack connected (README section 11.4) and screenshots 05 and 06 taken.
- [ ] Demonstration video recorded and its link pasted in README section 19.
- [ ] Every link in `REFERENCES.md` opened and its access date confirmed.
- [ ] Commit history has the number of commits and contributors the brief asks for (75 or more, several authors).
- [ ] `git status` shows no `.env`, `*.pem`, `node_modules/`, logs or `.vs/` files.
- [ ] The repository is public (or CodeQL is available) and the README renders correctly on GitHub.

## Demonstration video outline (about 8 minutes)

1. **Start the stack** (30 s): `docker compose up --build -d`, then `docker compose ps` showing all three containers running.
2. **Authentication** (1 min): register a freelancer and a client, show a failed login, then a successful login.
3. **Gig creation** (1 min): freelancer creates a gig; show validation rejecting bad input.
4. **Booking and transaction** (1.5 min): client books the gig and sees the confirmation; freelancer sees the received booking.
5. **Dashboard** (1.5 min): freelancer dashboard with income, tax estimate, bar chart, bracket table and "How is this calculated?".
6. **Security features** (1.5 min): five wrong passwords then the lockout message; log out and show that the old token is rejected; a client opening `/admin` is turned away.
7. **Admin and logging** (1 min): admin console showing totals, the locked account and security events; Better Stack live tail showing the same events.
8. **Pipeline** (1 min): GitHub Actions run with all jobs green, the static analysis step and the Docker/Newman job.
