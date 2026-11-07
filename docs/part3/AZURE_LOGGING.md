# Pillar 5: Azure logging setup and verification

## What changed and why

HustleHub already writes structured authentication, security, gig, booking, transaction and system events to its local log and production container output. This addition sends the same redacted events to Azure Application Insights as custom events. An independent cloud copy helps investigate failed logins, access denials and transaction problems after a container is replaced. Request IDs connect related records. Cloud access and retention must be managed separately.

The adapter uses Node's existing `fetch` support and the regional Application Insights ingestion API. No new npm dependency, SDK instrumentation, public application hosting, Azure agent, browser tracking or database change is needed. Existing local logs and the admin security view continue to work.

Resource selected: `hustlehub-logs`, resource group `rg-hustlehub-poe`, South Africa North, Azure for Students. The original-system screenshots supplied from 5 November show live ingestion: [login, booking and transaction events](screenshots/Logging1.png), and [failed login and logout events](screenshots/Logging2.png). The original backend commit was not recorded. Reverify after deploying the final repository version; no alert-delivery proof is claimed.

## Apply and configure on Windows

1. Apply the final repository patch using its supplied instructions. Keep `backend/` and `frontend/` at the repository root. The Azure adapter and earlier console-redaction changes are already in the supplied repository; no application-source overwrite is needed. Preserve existing `.env`, certificates and database volumes.
2. In PowerShell:

   ```powershell
   # Start in your actual repository root, then:
   notepad .env
   ```

3. Preserve existing `JWT_SECRET` and `MONGO_PASSWORD`. Add this setting once, replacing the placeholder locally with the **full Connection string** copied from Azure Overview:

   ```dotenv
   APPLICATIONINSIGHTS_CONNECTION_STRING="<full connection string from Azure>"
   ```

   Leave `LOG_CLOUD_URL` and `LOG_CLOUD_TOKEN` empty. Do not copy `.env.example` over the existing `.env`. Do not use only the instrumentation key. For direct `npm start`, put the setting in `backend/.env` instead of the root `.env`.

4. Run checks and recreate the backend:

   ```powershell
   Set-Location backend
   npm.cmd run lint
   npm.cmd test
   cd ..
   docker compose config --quiet
   docker compose up --build -d backend
   docker compose restart frontend
   docker compose ps
   docker compose logs --since 5m backend
   Invoke-RestMethod "https://localhost:8443/api/health"
   ```

   Check each command succeeds before continuing. `config --quiet` validates without printing resolved secrets. Do not run `docker compose down -v`. Restarting the frontend refreshes nginx's backend address if Docker changed it. No local `npm start` is needed for this Docker run.

5. Check the most recent `server_started` event has `cloudLogging: true`. That means valid configuration was found; it does **not** prove Azure has received anything.

## Generate real events

- Open `https://localhost:8443`.
- Log in as a freelancer, create one test gig, and log out.
- Attempt one login with a deliberately wrong password, then log in correctly. Do not repeatedly fail and accidentally lock an account.
- Use a client account to book that gig once. This creates the simulated transaction as well.
- Log out. Check recent local events:

  ```powershell
  docker compose exec -T backend tail -n 30 logs/events.log
  ```

Expected examples: `server_started`, `user_login`, `user_logout`, `login_failed`, `gig_created`, `booking_created`, `transaction_created` and `http_request`. One booking and its transaction should have matching booking and request IDs. Passwords and bearer tokens must not appear. IP addresses, user IDs and failed-login email addresses may still be personal data: restrict access and use only the retention needed for the project.

## Find the events in Azure

Open **hustlehub-logs > Logs** and close any introductory query panel. Switch to **KQL mode** if prompted. Run the query below and allow a few minutes for initial ingestion:

```kusto
customEvents
| where timestamp > ago(24h)
| where cloud_RoleName == "hustlehub-backend"
| project timestamp, name,
    category=tostring(customDimensions.category),
    level=tostring(customDimensions.level),
    requestId=tostring(customDimensions.requestId),
    bookingId=tostring(customDimensions.bookingId),
    transactionId=tostring(customDimensions.transactionId),
    amount=tostring(customDimensions.amount)
| order by timestamp desc
| take 50
```

If you opened **Logs on the Log Analytics workspace** instead of the Application Insights resource, use its workspace table names:

```kusto
AppEvents
| where TimeGenerated > ago(24h)
| where AppRoleName == "hustlehub-backend"
| project TimeGenerated, Name,
    category=tostring(Properties.category),
    level=tostring(Properties.level),
    requestId=tostring(Properties.requestId),
    bookingId=tostring(Properties.bookingId),
    transactionId=tostring(Properties.transactionId),
    amount=tostring(Properties.amount)
| order by TimeGenerated desc
| take 50
```

Use returned timestamps and IDs to match actual application actions. This adapter sends **customEvents**, not `traces` or automatic `requests`; empty Live Metrics graphs do not mean event shipping failed. Event details become string-valued `customDimensions` (or workspace `Properties`). The custom event's original timestamp is retained.

## If no events appear

1. Check the newest backend startup entry says `cloudLogging: true`. If false, confirm the full setting is in the root `.env`, has the exact variable name, contains a valid `InstrumentationKey` and HTTPS `IngestionEndpoint`, and that the backend was recreated after editing.
2. Look for `Cloud log delivery failed (will retry)` in backend output. Confirm internet access, resource ingestion access, quota and active subscription. Keep Azure public ingestion available for the local Docker sender. If your organisation requires Entra-authenticated ingestion and disables local/ikey authentication, this lightweight adapter will not authenticate; that setup needs a different integration.
3. Confirm you opened the same Azure resource you copied the connection string from and selected a recent time range. Run the appropriate table query above.
4. Allow several minutes, generate another login event and run the query again. Send only redacted errors or a query-results screenshot for troubleshooting. Do not paste the connection string, resolved Compose configuration or `.env`.

## Delivery behaviour and limits

- Azure takes precedence if its setting is supplied. Invalid Azure configuration disables cloud shipping; it does not silently switch to another provider. If no Azure setting is supplied, the previous Better Stack URL/token mode remains available.
- Events are queued in memory, at most 1,000 waiting entries; overflow drops the oldest. Batches contain at most 20 events, with a five-second timer for smaller batches. HTTPS requests time out after five seconds and do not follow redirects.
- Failed batches are retried. Azure HTTP 206 partial responses retry rejected entries only, preserving accepted items. Malformed partial responses retry the full batch. A response lost after server-side acceptance can cause duplicates. This is best-effort delivery, not exactly-once delivery.
- Graceful shutdown waits for the active send and drains queued events within the existing server's eight-second exit deadline. Forced shutdown loses the in-memory queue. The local log remains in the existing Docker volume, but is not automatically replayed to Azure.
- No automatic SDK collection or additional raw exception telemetry is enabled. Events pass through the existing redaction before the Azure mapping. Connection strings and raw network errors are not written by the cloud sender.
- Cloud ingestion is separate from alerts. Suggested alerts are repeated `login_failed`, `account_locked`, bursts of `rate_limit_exceeded`, or `level=error`; no Azure alert rule is created by this patch.
- Student credit is not unlimited free retention. Review Azure's workspace usage, retention and any daily cap suitable for the short assessment run. A cap can stop ingestion, so do not use it as proof of complete delivery.

## Evidence checklist

- [ ] Backend lint and automated tests pass after copying the files.
- [ ] Docker services are healthy and the HTTPS health endpoint succeeds.
- [ ] New startup event has `cloudLogging: true`.
- [x] Supplied original-system screenshots show login success/failure, booking and transaction events in Azure.
- [ ] Recheck those events on the final repository deployment.
- [ ] Booking/transaction IDs and request IDs match local events.
- [x] Original evidence included as `docs/part3/screenshots/Logging1.png` and `Logging2.png`.
- [ ] Date, final tested commit and screenshot path recorded in submission evidence.
- [ ] README section 11 explains destinations, purpose, configuration and verification.

Local unit tests use mocked HTTP responses and in-memory repositories; they do not prove live Azure delivery, Docker health or database persistence. Tick these separately after observing them.

## References

Microsoft, n.d.a. Troubleshoot missing application telemetry in Azure Monitor Application Insights. Available at: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-monitor/app-insights/telemetry/investigate-missing-telemetry [Accessed 5 November 2026].

Microsoft, n.d.b. Connection strings in Application Insights. Available at: https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings [Accessed 5 November 2026].
