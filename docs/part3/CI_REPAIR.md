# Pillar 2: repairs following CI run 18

## Observed failures

Run 18 on branch `blake`, commit `6298e00`, passed backend checks, frontend checks/build and the Trivy repository scan. CodeQL analysis reached the upload step, where GitHub refused results because GitHub Advanced Security / Code Security was not enabled for this private Classroom repository. This is not recorded as a clean CodeQL result.

The Docker stack job reached its image scan. Its frontend image reported 75 HIGH and 4 CRITICAL vulnerability entries. The four CRITICAL entries affected brotli-libs, libcrypto3, libssl3 and nginx, with fixes listed in the supplied report. The existing critical-image gate correctly failed the job and the final pipeline result.

The backend report additionally identified 6 HIGH findings in npm's bundled brace-expansion/undici packages, plus 2 HIGH detections for demonstration private keys generated during the image build. The report did not identify these keys as Blake's host keys; they were build-generated keys. They should still be absent from reusable images.

## Changes in this patch

1. Remove the CodeQL-specific job and its final-gate dependency because the repository cannot use that service as configured. This is not an ignored error, a clean scan claim or a switch of repository visibility. The mandatory static-analysis requirement is covered by the existing ESLint/security-rule steps, which fail on any warning/error and retain reports. Trivy repository/image checks, audits, tests and final failure gating remain enforced.
2. Update the frontend runtime to the maintained upstream `nginx/nginx-unprivileged:1.30.6-alpine3.24` image and apply available Alpine package fixes. Restore the `nginx` runtime user after the build-time package update. Ports, nginx configuration, HTTPS mounts and the health check are unchanged.
3. Apply available Alpine package fixes to the backend image, remove the unused npm/npx runtime toolchain that contains the reported findings, and stop baking demonstration private keys into image layers. Production application dependencies are still installed in the separate dependency stage; the runtime retains Node and OpenSSL. The CI runner/Windows host generates certificates and Compose mounts them at runtime, as already configured.
4. Use `docker compose build --pull` in CI so base images are refreshed. No vulnerability threshold is lowered and no CVE is excluded.

## Verify with the next real CI run

- Backend/frontend lint, tests and audit steps pass.
- Both images build, all containers become healthy, smoke tests and Newman pass, and expected log events are present.
- The Trivy repository and image gates pass. Review and save actual findings, including HIGH reports; do not infer a zero finding count from a green CRITICAL gate.
- The backend's build-generated key detections and the reported npm-toolchain findings are absent in the rebuilt image. Investigate anything remaining rather than suppressing it.
- The final Pipeline result passes only when backend, frontend, repo-scan and stack jobs all succeed.

The supplied failure screenshot can be retained as actual evidence of failure handling. A new green run and its image reports remain necessary; no live Docker/GitHub run is claimed by this patch.

## Documentation and remaining Pillar 2 work

When finalising Pillars 3/8, replace old README/EVIDENCE/STATIC_ANALYSIS references that describe CodeQL as an active or pending required scan. State that ESLint with its security plugin is the source-analysis tool; Trivy and npm audit cover their respective repository/image/dependency checks. Retain the CodeQL failure as an explained service limitation, not a pass. Capture an ESLint/security-analysis screenshot instead of a CodeQL alerts screenshot. Update older statements about demo keys in the backend image after confirming the rebuilt image.

Automated frontend browser-integration tests required by the assessment-preparation guide are still a separate outstanding task. This repair does not add those tests and does not by itself complete Pillar 2. Existing source/lockfiles, the application data and the completed Pillar 1 checks are unchanged.

## References consulted

- GitHub, Upload fails because GitHub Code Security is disabled: https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/troubleshoot-sarif-uploads/ghas-required
- GitHub, CodeQL Action licence/supported use: https://github.com/github/codeql-action#license
- NGINX, maintained unprivileged images and registry namespace: https://github.com/nginx/docker-nginx-unprivileged
- NGINX, current stable Alpine Dockerfile: https://github.com/nginx/docker-nginx-unprivileged/blob/main/stable/alpine-slim/Dockerfile

The new frontend tag was confirmed available in Docker Registry for Linux amd64/arm64 and other platforms. Tag availability does not establish a clean vulnerability scan; the next real image scan is authoritative.
