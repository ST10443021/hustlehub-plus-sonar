# Frontend browser integration evidence

The frontend now has two Playwright tests in `frontend/e2e/marketplace.spec.js`, in addition to the existing Vitest component tests and Postman/Newman API checks. The browser suite uses actual pages, HTTPS requests and MongoDB. It does not mock endpoints or inject authentication tokens.

## Coverage

| Browser check | Expected result |
| --- | --- |
| Register freelancer and client; log in independently | Both accounts work, with separate browser sessions |
| Create a gig as the freelancer | Saved listing appears at its submitted price |
| Book that gig as the client | Confirmation records a simulated payment of R150,000 |
| View client and freelancer booking lists | Both show the saved booking at R150,000 |
| View the freelancer dashboard | One booking; R150,000 income; R9,180 estimated tax; R140,820 after tax using the application's 2026/27 table |
| View chart and recent payments | Saved amount appears in both |
| Refresh booking and dashboard pages | Session is restored and saved records remain visible |
| Visit a private page while signed out | Login is required |
| Submit an incorrect password | Safe failure message; no signed-in session |
| Visit freelancer routes as a client | User returns to Browse Gigs; freelancer screens are unavailable |
| Log out, then visit My Bookings | Login is required again |

The route checks above verify browser behaviour. Server-side role/ownership security remains covered separately by the backend and Newman checks.

## Normal run: GitHub Actions

Push the patch on your own branch. The existing `stack` job starts its disposable Docker Compose application/database, runs Newman and verifies logging, restarts the API to clear the rate limits intentionally exhausted by Newman, then installs Chromium and runs `npm run test:e2e` in `frontend/`.

Browser failures fail the stack job and the final pipeline gate. Existing lint, unit tests, build, audit, repository scanning, image scanning and cleanup remain active. No CodeQL entitlement is assumed.

Open the completed run, then:

1. Expand **Browser integration - real frontend, HTTPS API and MongoDB**. Both tests must pass.
2. Download **frontend-browser-integration** from Artifacts and open `index.html` in the downloaded Playwright report folder. The artifact also includes JUnit results and failure screenshots if any.
3. Keep a screenshot of the successful run and browser-test step with the final submission evidence. Keep the run/commit link too.

CI's final cleanup removes its own temporary containers and volumes. These workflow commands must not be copied into the working local environment.

## Local use: isolated test database only

You do not need to run these tests against the app containing your real demonstration accounts/bookings. CI supplies the isolated environment automatically.

For a separate local test deployment that already serves the real app/API over HTTPS and uses a disposable MongoDB database:

```powershell
# Run inside frontend/. Replace the port with your isolated deployment's port.
npm.cmd ci
npx.cmd playwright install chromium
$env:E2E_ALLOW_TEST_DATA = "1"
$env:E2E_BASE_URL = "https://localhost:18443"
npm.cmd run test:e2e
npm.cmd run test:e2e:report
Remove-Item Env:E2E_ALLOW_TEST_DATA, Env:E2E_BASE_URL -ErrorAction SilentlyContinue
```

The suite requires explicit test-data opt-in and accepts only an HTTPS loopback URL. This prevents accidental remote targeting; a localhost URL alone does not prove database isolation, so confirm the test deployment's database configuration before opting in. It creates three uniquely named fictional accounts, one gig, one booking and one simulated transaction. It does not delete or clean a shared database.

The browser accepts the disposable local certificate; this does not change application TLS or install a CA on your computer. Network traces and videos are disabled, and no saved authentication state is exported. Reports and failure screenshots are git-ignored.

## Evidence limits

Passing browser tests demonstrate the listed flows. A page refresh checks saved records and session recovery; it is not a MongoDB restart/persistence test, a public-hosting check, proof of all security controls, or an automatic assessment mark. Keep the separate checks and evidence required elsewhere in the PoE.

References: Microsoft, Playwright configuration and CI documentation, https://playwright.dev/docs/test-configuration and https://playwright.dev/docs/ci-intro (accessed 7 November 2026).
