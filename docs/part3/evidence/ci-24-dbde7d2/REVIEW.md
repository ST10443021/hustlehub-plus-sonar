# CI 24 analysis review

Reviewed 7 November 2026. Application checkout: branch `blake`, commit [`dbde7d2`](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/dbde7d2). The supplied screenshot shows CI run **24** succeeded. The four artifact archives were supplied by Blake as the results from that run. Their contents do not independently embed the Git commit or Actions run ID; this association comes from that supplied run context. The commit's [Checks tab](https://github.com/EMGPPT/insy7314-g1-part-2-and-poe-group-32/commit/dbde7d2/checks) provides the route to the corresponding workflow run.

## Results and interpretation

| Check | Observed result | Report |
| --- | --- | --- |
| Backend ESLint | 47 file entries; 0 errors; 0 warnings | [JSON](backend/eslint-report.json) |
| Frontend ESLint | 40 file entries; 0 errors; 0 warnings | [JSON](frontend/eslint-report.json) |
| Backend production audit | 0 reported vulnerabilities | [Output](backend/npm-audit-production.txt) |
| Frontend production audit | 0 reported vulnerabilities | [Output](frontend/npm-audit-production.txt) |
| Frontend full audit, including dev tools | 0 reported vulnerabilities | [JSON](frontend/npm-audit-full.json) |
| Backend full audit, including dev tools | 27 affected package entries: 6 LOW, 8 MODERATE, 12 HIGH, 1 CRITICAL | [JSON](backend/npm-audit-full.json) |
| Trivy repository scan | All displayed vulnerability/misconfiguration counts are 0 at the configured filters | [Report](trivy/trivy-repo.txt) |
| Trivy backend image | All displayed vulnerability counts are 0 at HIGH/CRITICAL with `--ignore-unfixed` | [Report](trivy/trivy-backend-image.txt) |
| Trivy frontend image | Displayed vulnerability count is 0 at HIGH/CRITICAL with `--ignore-unfixed` | [Report](trivy/trivy-frontend-image.txt) |
| Live Newman | 67 requests, 90 assertions, 0 failures | [Safe summary](stack/newman-summary.json) |
| Docker stack | Backend, frontend and MongoDB all healthy | [Container status](stack/compose-ps.txt) |

A green job confirms its configured checks passed. It does not prove zero findings at every severity, include unfixed vulnerabilities, scan repository history, or make the application production-ready. The Trivy reports exclude unfixed vulnerabilities; the repository scan covers HIGH/CRITICAL and image gating blocks fixable CRITICAL findings. Both saved image reports also include fixable HIGH findings and show none.

The backend ESLint JSON retains 12 suppressed messages: operator-controlled filesystem paths in `generateCert.js`, `server.js` and `eventLogger.js`, and fixed-list environment access in `env.js`. These are the targeted reviewed exceptions described in STATIC_ANALYSIS.md. Zero active warnings does not mean those rules were never reviewed or suppressed. There are no suppressed messages in the supplied frontend report.

## Development-tool risk review

All nodes named in the 27 backend audit entries are marked `dev: true` in the supplied backend lockfile. The production audit reports zero and the API image installs with `npm ci --omit=dev`. These packages are excluded from the production API dependency tree.

| Tool chain | Affected package entries | Severity counts | Exposure and next action |
| --- | ---: | --- | --- |
| Newman/Postman | 19 | 12 HIGH, 6 MODERATE, 1 CRITICAL | Used by the runner for the checked-in collection against its disposable stack. Restrict collection/script/template inputs to trusted project material. Review an upstream-compatible upgrade; do not force the proposed Newman 4.6.1 downgrade. |
| Jest | 6 | 6 LOW | Used for checked-in tests and configuration. Review dependency updates without blindly downgrading Jest to 25.1.0. |
| nodemon | 2 | 2 MODERATE | Local development watcher, not the production start command. The audit marks a compatible fix available; update and retest the watcher in a dependency-maintenance change. |

The CRITICAL package entry is `handlebars` in the Postman runtime chain. Its advisory set includes template/AST-related JavaScript-injection issues and others. Exclusion from the runtime image reduces deployment exposure, but does not fix the development tool or make this a false positive. No exploit test or complete reachability analysis was performed. No claim of a clean backend full audit is made.

The existing project decision to isolate Newman from production remains documented, now with exact current counts. Jest/nodemon findings are recorded as follow-up maintenance items. Documenting these findings is not equivalent to remediation and may affect the rubric's highest band, which asks for no unresolved security issues. This evidence package completes result recording and explanation; it does not guarantee full marks or silently approve every residual risk.

### Every affected package entry

These are npm's vulnerable-package entries, including dependency-chain metadata; they are not 27 distinct CVEs.

| Package | Reported severity | Tool chain | Follow-up |
| --- | --- | --- | --- |
| `@faker-js/faker` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `@jest/core` | LOW | Jest | Audit suggests a major downgrade of jest to 25.1.0; needs dependency review and retesting |
| `create-jest` | LOW | Jest | Audit suggests a major downgrade of jest to 25.1.0; needs dependency review and retesting |
| `csv-parse` | MODERATE | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `deepmerge` | LOW | Jest | Audit suggests a major downgrade of jest to 25.1.0; needs dependency review and retesting |
| `flatted` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `handlebars` | CRITICAL | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `httpntlm` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `jest` | LOW | Jest | Audit suggests a major downgrade of jest to 25.1.0; needs dependency review and retesting |
| `jest-cli` | LOW | Jest | Audit suggests a major downgrade of jest to 25.1.0; needs dependency review and retesting |
| `jest-config` | LOW | Jest | Audit suggests a major downgrade of jest to 25.1.0; needs dependency review and retesting |
| `jose` | MODERATE | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `lodash` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `minimatch` | MODERATE | nodemon | Compatible patch/minor update reported available; verify and retest separately |
| `newman` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `node-forge` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `nodemon` | MODERATE | nodemon | Compatible patch/minor update reported available; verify and retest separately |
| `postman-collection` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `postman-collection-transformer` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `postman-request` | MODERATE | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `postman-runtime` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `postman-sandbox` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `qs` | MODERATE | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `serialised-error` | MODERATE | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `underscore` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `uuid` | MODERATE | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |
| `uvm` | HIGH | Newman/Postman | Audit suggests a major downgrade of newman to 4.6.1; needs dependency review and retesting |

## CodeQL service limitation

CodeQL upload in run 18 failed because GitHub Code Security / Advanced Security was unavailable for the private Classroom repository. The job was removed explicitly in the CI repair. ESLint with `eslint-plugin-security` is the active source-analysis tool; React/React Hooks rules also run for the frontend. Trivy and npm audit cover different repository, image and dependency checks. They are not described as a replacement for CodeQL's full data-flow analysis. CodeQL is not recorded as passed, dismissed, or zero alerts.

## Evidence handling

The report files linked here are byte-for-byte copies from the four supplied archives. Original archives and individual report SHA-256 hashes are recorded in PROVENANCE.json. Raw application/test console logs were reviewed only for relevant outcomes and are not copied into this package. No JWTs, request bodies, environment values, private keys or browser authentication state are included in these selected reports.

Before final submission, keep the successful run screenshot and an ESLint analysis-step screenshot with the evidence, merge through the agreed PR process, and retain a green run for the actual submitted application version. Reassess the reports if dependencies or code change.

References: npm audit command documentation, https://docs.npmjs.com/cli/v11/commands/npm-audit/; GitHub Code Security upload limitation, https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/troubleshoot-sarif-uploads/ghas-required (accessed 7 November 2026). Advisory URLs for every affected package are retained in the full audit JSON.
