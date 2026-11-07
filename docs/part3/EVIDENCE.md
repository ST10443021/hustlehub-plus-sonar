# Final PoE evidence index

Updated 7 November 2026. CI 24 on `blake` (`dbde7d2`) has passed. Its supplied analysis/stack artifacts are recorded separately from older local evidence and from work still required for final submission.

## Included implementation and evidence

| Item | Location | Evidence boundary |
| --- | --- | --- |
| Pipeline and dependency updates | [Workflow](../../.github/workflows/ci.yml), [Dependabot](../../.github/dependabot.yml) | CI 24 passed at `dbde7d2`; [run review](evidence/ci-24-dbde7d2/REVIEW.md) |
| Containers and orchestration | [Backend Dockerfile](../../backend/Dockerfile), [frontend Dockerfile](../../frontend/Dockerfile), [Compose](../../docker-compose.yml) | CI 24: all services healthy; [container status](evidence/ci-24-dbde7d2/stack/compose-ps.txt) |
| Final documentation and security review | [README](../../README.md), [supporting review](SECURITY_REVIEW.md) | Final README restored; pending items are marked explicitly |
| Static analysis explanation | [STATIC_ANALYSIS.md](STATIC_ANALYSIS.md) | Actual lint/audit/Trivy reports reviewed; 27 backend development-tool package findings remain documented; CodeQL not active |
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

## Reviewed CI 24 evidence

Application commit: [`dbde7d2`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/dbde7d2). [Checks tab](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/dbde7d2/checks). Artifacts were supplied by Blake after showing the green run; the ZIPs do not independently identify their Actions run ID.

- [x] Backend/frontend ESLint reports: zero active errors/warnings.
- [x] Production audits: zero reported vulnerabilities in both apps; frontend full audit also zero.
- [x] Full backend audit reviewed: 27 affected dev-tool packages, including one critical; exposure, mitigations and follow-up recorded.
- [x] Repository and both image Trivy reports reviewed at their configured filters.
- [x] Container status and safe live Newman summary retained: all services healthy; 67 requests, 90 assertions, no failures.
- [x] CodeQL entitlement limitation explained; active/pending scan claims corrected.

The [review and all report links](evidence/ci-24-dbde7d2/REVIEW.md) include the provenance/hashes. Browser integration was part of the successful run shown in the supplied screenshot; its separate artifact was not included among these four ZIPs. Download/retain it separately if needed.

## Still to record on the final version

- [ ] Retain the green CI 24 screenshot and an ESLint analysis-step screenshot; keep a green run for the actual merged submission version.
- [ ] Review and resolve or explicitly retain the documented backend development-tool advisories; reassess if dependencies change. Recorded risk is not a remediation claim.
- [x] CI 24 containers and safe Newman summary retained with the analysis artifacts.
- [x] Supplied earlier GitHub screenshots show failed checks failing the pipeline; CI 24 is the subsequent successful application run.
- [ ] Local Docker/MongoDB marketplace flow and final dashboard screenshot with income/chart/tax breakdown.
- [ ] Final security/admin screenshots where needed, and a cloud ingestion recheck after deployment.
- [ ] Final accessible demonstration video link in README section 19.
- [ ] Final tested commit and evidence date recorded; all README links checked.
- [ ] Contribution history reviewed against the supplied rubric without padding commits.
- [ ] Secrets/private keys excluded from tracked files and submitted archives.

Suggested new screenshots: `01-ci-pipeline-green.png`, `02-ci-stack-containers-running.png`, `03-eslint-static-analysis.png`, `04-trivy-image-scan.png`, `07-dashboard-chart.png`, `08-admin-console.png`, `09-docker-compose-ps.png`. Link the existing Azure screenshots above; changing cloud providers is unnecessary.

The four supplied CI 24 artifacts have been reviewed and the selected safe reports are retained under `evidence/ci-24-dbde7d2/`. Download fresh artifacts after application/dependency changes. Review logs before committing any artifact. Follow [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md) for isolated live testing.

## Demonstration sequence

Show registration/login; freelancer gig creation; client booking and booking history; freelancer received booking, transaction and income/tax chart; account lockout and token revocation; containers; actual Azure events; the pipeline and its analysis outputs. Use the completed final recording, then verify its sharing permissions.
