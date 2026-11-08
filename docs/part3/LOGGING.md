# Logging and cloud monitoring

HustleHub+ writes one structured JSON line for every security-relevant or business-relevant event and ships the same lines to a cloud log platform. The README ("Logging and monitoring") explains what is logged and why; this page is the setup and operations guide (IIE, 2026c).

## Provider

The submitted deployment uses **Azure Application Insights**, a cloud-based logging and monitoring platform (Microsoft, n.d.a). The rubric names Grafana only as an example of a cloud platform; Application Insights meets the same requirement (cloud storage, search, charts and alerts) and the application delivers events in Application Insights' documented format (covered by `azureLogging.test.js`); the live Azure query screenshots listed in `EVIDENCE.md` show them arriving. Azure Monitor data can also be added to a Grafana dashboard as a data source if a Grafana view is wanted, with no change to the application.

The backend can also post the same events to any HTTPS JSON ingest endpoint (`LOG_CLOUD_URL` plus `LOG_CLOUD_TOKEN`). That generic path is kept for portability and is **not** used in the submitted deployment; when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set it takes precedence (Better Stack, n.d.).

## How events get to Azure

```
eventLogger.js  ->  redact + truncate  ->  1. logs/events.log (rotates at 5 MB)
                                           2. standard output (collected by Docker)
                                           3. cloudLogger.js -> azureLogTransport.js -> Application Insights /v2.1/track
```

- Each event becomes an Application Insights **custom event**: the event name is the custom event name and every other field is a custom property (Microsoft, n.d.a).
- Shipping is buffered, batched and retried, and never blocks or breaks a request. If Azure is unreachable the file and container logs still hold every event, and the buffer is flushed on shutdown (Docker, Inc., n.d.a).
- E-mail addresses are never sent. Any email field is replaced by `emailHash` (a keyed hash) before the event is written or shipped, so Azure holds no personal addresses and a password mistyped into the email box cannot reach the log (Republic of South Africa, 2013; OWASP, 2024d).
- The connection string is read only from the environment. It is never written to a log, an error message or the repository (Microsoft, n.d.b).

## Setup (about five minutes, free tier)

1. In the Azure portal create an **Application Insights** resource (workspace-based). Any region.
2. On the resource **Overview** page copy the full **Connection string** (it starts with `InstrumentationKey=`).
3. Put it in the repository root `.env` (never commit this file):

   ```
   APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
   ```

4. Start the stack with `docker compose up --build -d --wait`. The log line `server_started` reports `"cloudLogging": true` when shipping is on.
5. Use the app (log in, fail a login, book a gig). Events appear in Azure after one to three minutes.

## Queries used for the evidence screenshots

Open the resource, then **Logs**, and run:

```kusto
// every HustleHub+ event in the last hour, newest first
customEvents
| where timestamp > ago(1h) and cloud_RoleName == "hustlehub-backend"
| project timestamp, name, category = tostring(customDimensions.category), level = tostring(customDimensions.level)
| order by timestamp desc
```

```kusto
// events by type: logins, failed logins, lockouts, bookings, transactions, errors
customEvents
| where timestamp > ago(24h) and cloud_RoleName == "hustlehub-backend"
| summarize count() by name
| order by count_ desc
```

```kusto
// security view: failures, lockouts, rejected tokens, access denied, rate limiting
customEvents
| where timestamp > ago(24h) and name in ("login_failed", "login_blocked", "account_locked", "token_rejected", "access_denied", "rate_limit_exceeded")
| summarize count() by name, bin(timestamp, 15m)
| render timechart
```

```kusto
// repeated failures against the same (hashed) email: password guessing against one account
customEvents
| where timestamp > ago(24h) and name == "login_failed"
| summarize failures = count() by emailHash = tostring(customDimensions.emailHash), reason = tostring(customDimensions.reason)
| order by failures desc
```

## Evidence to capture (see `EVIDENCE.md`)

- `logging-azure-events.png`: the first query showing login, booking and transaction events.
- `logging-azure-chart.png`: the third query rendered as a chart.
- `docs/part3/evidence/logging-sample.jsonl`: real log lines from a verified run (committed).

## Alerting (optional extra)

In Application Insights create an alert rule on the `account_locked` count (for example more than 3 in 5 minutes) to e-mail the team. This turns the log from a record into an early-warning signal.
