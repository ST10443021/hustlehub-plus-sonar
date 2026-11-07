# Final PoE evidence index

Updated 7 November 2026. Configuration and dated observations are listed separately from execution still required on the final repository commit.

## Included implementation and evidence

| Item | Location | Evidence boundary |
| --- | --- | --- |
| Pipeline and dependency updates | [Workflow](../../.github/workflows/ci.yml), [Dependabot](../../.github/dependabot.yml) | Restored configuration; final GitHub run pending |
| Containers and orchestration | [Backend Dockerfile](../../backend/Dockerfile), [frontend Dockerfile](../../frontend/Dockerfile), [Compose](../../docker-compose.yml) | Corrected configuration; final run and pipeline proof pending |
| Final documentation and security review | [README](../../README.md), [supporting review](SECURITY_REVIEW.md) | Final README restored; pending items are marked explicitly |
| Static analysis explanation | [STATIC_ANALYSIS.md](STATIC_ANALYSIS.md) | Local lint/audit results present; actual CodeQL/Trivy results pending |
| Backend tests | [7 November output](evidence/review-2026-11-07/backend-tests.txt) | 127 tests / 8 suites; memory repositories and mocked cloud HTTP |
| Frontend tests | [7 November output](evidence/review-2026-11-07/frontend-tests.txt) | 63 tests / 13 files; mocked API component tests |
| Frontend build | [7 November output](evidence/review-2026-11-07/frontend-build.txt) | Production build succeeded in the audit workspace |
| Lint and production audits | [Dated outputs](evidence/review-2026-11-07/) | Both linters passed; both production audits reported zero; no full-tree/image claim |
| Azure cloud ingestion | [Logging1](screenshots/Logging1.png), [Logging2](screenshots/Logging2.png) | Original-system screenshots from 5 November: login, failure, logout, booking and transaction; final commit not recorded |
| Account lockout | [Lockout screenshot](screenshots/SecurityTest2.png) | Original-system UI observation |
| Server-side token revocation | [HTTP sequence](screenshots/SecurityTest.png) | Original-system 200 → 200 → 401 → 200 sequence |
| Earlier application screenshots | [Part 2 screenshots](../part2/screenshots/) | Historical application evidence; capture the final dashboard separately |
| Earlier Newman run | [Output](evidence/newman-local-run.txt), [summary](evidence/newman-local-summary.json) | 30 October, 67 executions / 90 assertions; not a final MongoDB-backed Docker run |

Older top-level backend/frontend evidence files describe earlier 105/54-test runs. They are retained as history, not presented as the latest verification. The collection has 55 saved request definitions; deliberate repeats and optional admin checks affect execution counts.

## Still to record on the final version

- [ ] Latest GitHub Actions run, with all jobs green and a link to the exact commit.
- [ ] Actual CodeQL outcomes reviewed and actual Trivy repository/image results entered in STATIC_ANALYSIS.md.
- [ ] Containers running in the pipeline, with Newman results and downloaded artifacts.
- [ ] A real failing check shown to make the GitHub pipeline fail; distinguish this from the local Bash failure-propagation check.
- [ ] Local Docker/MongoDB marketplace flow and final dashboard screenshot with income/chart/tax breakdown.
- [ ] Final security/admin screenshots where needed, and a cloud ingestion recheck after deployment.
- [ ] Final accessible demonstration video link in README section 19.
- [ ] Final tested commit and evidence date recorded; all README links checked.
- [ ] Contribution history reviewed against the supplied rubric without padding commits.
- [ ] Secrets/private keys excluded from tracked files and submitted archives.

Suggested new screenshots: `01-ci-pipeline-green.png`, `02-ci-stack-containers-running.png`, `03-codeql-code-scanning.png`, `04-trivy-image-scan.png`, `07-dashboard-chart.png`, `08-admin-console.png`, `09-docker-compose-ps.png`. Link the existing Azure screenshots above; changing cloud providers is unnecessary.

Download `backend-static-analysis`, `frontend-static-analysis`, `trivy-repository-report` and `stack-evidence` from Actions. Review logs before committing any artifact. Follow [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md) for isolated live testing.

## Demonstration sequence

Show registration/login; freelancer gig creation; client booking and booking history; freelancer received booking, transaction and income/tax chart; account lockout and token revocation; containers; actual Azure events; the pipeline and its analysis outputs. Use the completed final recording, then verify its sharing permissions.
