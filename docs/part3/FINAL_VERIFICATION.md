# Final verification on Windows

Use your actual repository root. Keep existing coursework data and secrets. Apply the patch on your named branch, review its diff and use a pull request into main. This procedure does not merge or push anything automatically.

## 1. Local checks

Run each command separately and stop if one fails:

```powershell
Set-Location backend
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd audit --omit=dev --audit-level=high
Set-Location ../frontend
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev --audit-level=high
Set-Location ..
```

The supplied source passed 127 backend tests and 63 frontend tests in the 7 November audit workspace. Rerun on your final reviewed version. Those tests use memory repositories/mocked HTTP and do not prove database persistence or cloud ingestion.

## 2. Preserve existing settings and database

- Preserve an existing root `.env`, `backend/.env`, certificates and named volumes.
- Root `.env` needs a strong `JWT_SECRET` and a URL-safe `MONGO_PASSWORD` for the corrected Compose configuration. Existing values stay local; fill missing values in an editor. Do not print resolved Compose configuration.
- Existing MongoDB volumes keep their existing users/passwords. Adding `MONGO_INITDB_ROOT_PASSWORD` does not migrate an already-populated database. Do not delete the old volume to resolve this. Preserve it and back it up before any deliberate migration.
- The project below uses separate named volumes. It needs ports 8080/8443 free. If your existing Compose stack occupies them, record its project/settings and stop that stack first; stopping preserves its data. Do not stop an unrelated project.

Only if there is no root `.env` yet:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Generate certificates only if your current certificate pair is absent:

```powershell
if (-not ((Test-Path backend/certs/key.pem) -and (Test-Path backend/certs/cert.pem) -and (Test-Path backend/certs/rootCA.pem))) {
    node backend/scripts/generateCert.js
}
docker compose config --quiet
```

Compose project names isolate resources (Docker, Inc., n.d.c). Use a new verification project such as `hustlehub-poe-check`; if you already used that name, its earlier verification data persists. The separate project does not import your existing database or imply migration is complete.

```powershell
docker compose -p hustlehub-poe-check up --build -d --wait --wait-timeout 180
docker compose -p hustlehub-poe-check ps
```

All three services should be healthy. Open `https://localhost:8443`; trust the local CA using `npm.cmd run trust-cert` from `backend/` if needed. Keep any browser trust confirmation local.

## 3. Actual application flow

With disposable client/freelancer accounts, register/login, create a gig, book it, view both booking lists and confirm that the correct freelancer's income/transaction record updates. Restart the verification backend and confirm records survive. Capture the final dashboard chart and tax explanation.

```powershell
docker compose -p hustlehub-poe-check restart backend
docker compose -p hustlehub-poe-check restart frontend
```

The frontend restart refreshes nginx's backend address. Confirm the health endpoint and browser flow again.

## 4. Newman against this isolated database

Newman deliberately exhausts rate limits; run it on the verification stack, not your normal demonstration database. The default ADMIN checks are skipped unless you provide seeded admin credentials. For complete admin coverage, seed a disposable admin in this verification project, then supply those credentials to Newman. Enter its password privately; do not paste it in screenshots or commit it.

```powershell
$env:ADMIN_EMAIL = 'poe-check-admin@example.com'
$enteredPassword = Read-Host 'Disposable verification admin password' -AsSecureString
$adminCredential = New-Object System.Management.Automation.PSCredential($env:ADMIN_EMAIL, $enteredPassword)
$env:ADMIN_PASSWORD = $adminCredential.GetNetworkCredential().Password
try {
    docker compose -p hustlehub-poe-check exec -T -e ADMIN_EMAIL -e ADMIN_PASSWORD backend node scripts/seedAdmin.js
    if ($LASTEXITCODE -ne 0) { throw 'Admin seeding failed; stop here.' }
    $env:NEWMAN_BASE_URL = 'https://localhost:8443'
    Push-Location backend
    try {
        npm.cmd run test:api
        if ($LASTEXITCODE -ne 0) { throw 'Newman failed; inspect the output.' }
    } finally { Pop-Location }
} finally {
    Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:NEWMAN_BASE_URL -ErrorAction SilentlyContinue
    Remove-Variable enteredPassword, adminCredential -ErrorAction SilentlyContinue
}
docker compose -p hustlehub-poe-check restart backend
docker compose -p hustlehub-poe-check restart frontend
```

Save sanitised `backend/test-results/newman-summary.json` and `newman-junit.xml` under the final evidence folder with the tested commit/date. Use actual counts; 55 request definitions can produce more executions because probes repeat.

## 5. GitHub, cloud and video

Review `git diff`; commit meaningful changes on your own branch and push only that branch. Open a PR into main and stop for review. The restored workflow runs for named branches and pull requests. Resolve real failures, inspect CodeQL/Trivy results and download the artifacts. Do not treat a successful configuration lint as a green GitHub run. Demonstrate a real failing check separately if required for your evidence.

Existing Azure screenshots are included and dated. Recheck ingestion from the final deployment, and refresh only screenshots that need updating. Isolated Newman tests can generate test events in Azure if cloud delivery is configured; identify the verification accounts and timestamps.

Record the final video and add its accessible link to README section 19. Fill only genuinely pending results after observing them.

When finished, stop only the verification stack; its volumes remain:

```powershell
docker compose -p hustlehub-poe-check down
```

Restart your original project with its recorded configuration if needed. No database-volume deletion is part of this procedure.
