# Backend development-tool dependency maintenance

7 November 2026. This is a locally verified maintenance candidate following the CI 24 analysis review. Its new GitHub/Docker outcome remains pending until it is pushed and reviewed. CI 24's original reports remain unchanged as historical evidence.

## Changes

Scoped npm `overrides` select patched dependencies beneath Newman and nodemon, retaining the existing direct dependency ranges, CommonJS backend and Newman 6 runner. Package versions in the production dependency tree are unchanged. These overrides are explicit maintenance constraints: future tool upgrades must review them again.

| Scope | Package | Selected version |
| --- | --- | --- |
| Newman descendants | handlebars | 4.7.10 |
| Newman descendants | node-forge | 1.4.3 |
| Newman descendants | lodash | 4.18.1 |
| Newman descendants | flatted | 3.4.4 |
| Newman descendants | qs | 6.17.1 |
| Newman descendants | jose | 4.15.9 |
| Newman descendants | underscore | 1.13.8 |
| Newman descendants | uuid | 11.1.1 |
| nodemon descendants | minimatch | 11.0.1 |

UUID and minimatch cross major-version boundaries. The reviewed consumers use the exported UUID methods and minimatch API retained by these versions. They were checked through the live collection, Postman SDK item IDs/error decoration and an actual nodemon restart. UUID 11 retains CommonJS support; minimatch 11's supported Node versions include the project's Node 22/24 environment. This does not verify every possible Newman authentication/data-import feature.

## Observed local results

| Check | Before, CI 24 | After, local candidate |
| --- | --- | --- |
| Backend full npm audit, affected package entries | 27: 6 low, 8 moderate, 12 high, 1 critical | **12: 6 low, 1 moderate, 5 high, 0 critical** |
| Backend production audit | 0 | **0** |
| Backend Jest | 127 passed / 8 suites | **127 passed / 8 suites** |
| Backend ESLint | 0 active errors/warnings | **Passed; zero warnings allowed** |
| Live Newman against HTTPS + real isolated MongoDB | 67 requests / 90 assertions / 0 failures | **67 requests / 90 assertions / 0 failures**, including seeded admin checks |
| nodemon watcher | Earlier full audit affected its matcher | **Starts and restarts after a real watched-file edit** |

The Handlebars critical entry and the selected node-forge, lodash, flatted, qs, jose, underscore, UUID and nodemon/matcher advisories are no longer listed in the new audit. Current scope and every report are linked below. These are observed local results, not a new GitHub run or image scan.

## Remaining findings and bounded treatment

The 12 package entries derive from three underlying vulnerable libraries, with additional entries marking affected parent tool packages:

| Library | Severity | Why a further automatic override was not used | Treatment in this project |
| --- | --- | --- | --- |
| `@faker-js/faker` 5.5.3 | HIGH | The Postman SDK pins the older Faker API. A modern major changes APIs; overriding it without adapting/retesting the SDK is unsafe. | The checked-in collection does not call `helpers.fake`. Only trusted project collections/scripts run on the disposable stack; do not run untrusted Faker expressions/templates. Excluded from production. |
| `csv-parse` 4.16.3 | MODERATE | The advisory's fix is in 7.0.2; Newman 6 expects the old callable CommonJS export, while the modern API exposes `parse`. A direct major override breaks CSV import. | This collection uses no CSV iteration-data input. Keep its controlled inputs and avoid untrusted CSV data. Excluded from production; review a supported Newman upgrade or explicit adapter separately if CSV import is needed. |
| `deepmerge` 4.3.1 | LOW | The reviewed advisory lists no patched version; 4.3.2 is not published. The suggested Jest downgrade is not a reviewed fix. | Used by Jest for trusted project tests/configuration. Excluded from production; monitor upstream for a compatible patch. |

These are reviewed residual development-tool risks, not repaired or false-positive findings. Controls reduce this project's exposure without removing the advisories. A clean full backend audit and the rubric's strongest no-unresolved-security-issues band are not guaranteed. The source analysis, production audit and submitted runtime remain the relevant separate scopes. Do not force a major downgrade or hide findings to obtain a green result.

### All remaining affected package entries

| Package entry | Reported severity |
| --- | --- |
| `@faker-js/faker` | HIGH |
| `@jest/core` | LOW |
| `create-jest` | LOW |
| `csv-parse` | MODERATE |
| `deepmerge` | LOW |
| `jest` | LOW |
| `jest-cli` | LOW |
| `jest-config` | LOW |
| `newman` | HIGH |
| `postman-collection` | HIGH |
| `postman-runtime` | HIGH |
| `postman-sandbox` | HIGH |

## Evidence

- [Full audit JSON](evidence/tooling-maintenance-2026-11-07/audit-full.json)
- [Production audit JSON](evidence/tooling-maintenance-2026-11-07/audit-production.json)
- [Backend check summary](evidence/tooling-maintenance-2026-11-07/backend-checks.txt)
- [Safe live Newman summary](evidence/tooling-maintenance-2026-11-07/newman-summary.json)
- [Actual nodemon restart output](evidence/tooling-maintenance-2026-11-07/nodemon-watch.txt)
- [Postman compatibility checks](evidence/tooling-maintenance-2026-11-07/compatibility-checks.txt)
- [Dependency-tree comparison and override list](evidence/tooling-maintenance-2026-11-07/package-tree-comparison.json)

After pushing, review the new run on `blake`: backend lint/tests/audits, fresh Docker builds, live Newman, browser integration and scan gates must pass. Retain that run and its artifacts for the resulting commit. Update evidence with the actual new CI result; do not relabel these local outputs as GitHub results.

References (accessed 7 November 2026): npm overrides, https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides; UUID 11.1.1 security backport, https://github.com/uuidjs/uuid/releases/tag/v11.1.1; minimatch 11.0.1, https://github.com/isaacs/minimatch/releases/tag/v11.0.1; deepmerge advisory/no patched version, https://github.com/advisories/GHSA-gcqx-w48m-w2h4. Remaining advisory URLs are retained in the full audit JSON.
