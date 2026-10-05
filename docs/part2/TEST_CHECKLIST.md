# Part 2 test checklist

Owner: Blake + Hamza. Connor and Muzzi check and improve their own screens.

## Starter frontend checks

Run `npm test` and `npm run build` in `client`. Tests exercise sample booking interaction, form validation, add/edit/delete interaction, sample record separation, and HTTP adapter behaviour. They **do not** test a live backend, database, HTTPS, JWT correctness, or server permissions.

## Add these live-system tests

- Signup/login success and failure; duplicate email; missing/expired/tampered token.
- Public signup rejects `admin` even if a caller bypasses the UI.
- Client cannot create/edit/delete a freelancer's service.
- Freelancer A cannot edit/delete freelancer B's service.
- Private bookings/income do not return another user's records.
- Valid service create/edit/delete and invalid title/description/price/ID inputs.
- Booking saves a transaction and contributes the exact saved fee to the correct freelancer.
- Price/client/freelancer values sent by a malicious browser cannot override trusted server values.
- Failed booking does not leave a transaction without a booking or vice versa.
- Retry behaviour does not accidentally duplicate a confirmed booking.
- Old booking fees remain correct after service price changes/removal.
- Records survive an API restart with MongoDB connected.
- Auth and booking rate limits return a clear 429 response.
- Security headers and CSP actually apply to the React app and API as designed.
- Wrong input, API failure and unavailable service show helpful UI errors; submit buttons cannot be spammed while saving.
- Screens render/click correctly and lists show loading, empty and error states.

## Postman draft

`POSTMAN_PART2_DRAFT.postman_collection.json` uses proposed new routes. It is an AI test foundation for Blake/Hamza to review and expand. It will fail on the unmodified Part 1 backend because marketplace routes do not exist and admin signup is still allowed.

Example command from the project root, once the real backend and Newman are installed:

```powershell
npx.cmd newman run docs/part2/POSTMAN_PART2_DRAFT.postman_collection.json --insecure
```

`--insecure` is for the local self-signed HTTPS certificate only. Use the proper trusted certificate/CA configuration for other environments. Use a clean test database or unique run data and document cleanup. The draft uses unique fictional emails per run but has no database reset or cleanup script.

## Evidence still needed

Real Newman output, real frontend test output after integration, application screenshots, correct setup documentation, and a demo of the database-backed system. No outcomes should be marked passed before they are observed.
