# Azure live-delivery confirmation

Observed in Blake's supplied Application Insights screenshot on 7 November 2026, following his Docker rebuild of application commit `7ef0cc1`. Blake confirmed the requested checks worked. The query selected the `hustlehub-backend` role and recent `user_login`, `login_failed` and `user_logout` events from `customEvents`.

Representative rows transcribed from the screenshot (Azure's displayed timestamps are UTC):

| Timestamp, 7 November 2026 UTC | Event | Level | Request ID |
| --- | --- | --- | --- |
| 14:35:26.827 | user_login | info | 623c3872-f2e2-4348-92a5-df29618c2ec4 |
| 14:33:19.920 | user_logout | info | bccc65f3-e976-4d7b-8676-f4989fd8a9ac |
| 14:33:08.111 | login_failed | warn | d061f0a4-1ed2-4798-9a16-33f53379b34f |

These rows confirm recent cloud ingestion rather than only a startup configuration flag. The screenshot was supplied in the same verification sequence as the local Docker output; the events do not independently embed the Git commit. The original portal screenshot is retained by Blake and is not reproduced here with account/subscription headers. This file is a transcription and observation record, not a new screenshot or exported Azure log file.

The earlier [Logging1](../../screenshots/Logging1.png) and [Logging2](../../screenshots/Logging2.png) screenshots remain the visual evidence for the 5 November login/booking/transaction and failed-login/logout checks. The fresh screenshot shown here covers authentication events; no new booking/transaction cloud capture or alert delivery is claimed. The [CI event correlation summary](stack/event-correlation-summary.json) separately records matching booking/transaction IDs from the live container run.
