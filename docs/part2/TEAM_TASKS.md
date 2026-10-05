# Agreed team split

These are work assignments, not claims that the features are finished.

| Owner | Main work | Starting point |
| --- | --- | --- |
| Blake + Hamza, together | Database, backend routes, signup/login, session management, navigation, income, security, API connection, integration, final tests, README, screenshots, Postman/Newman, and demo video. | Existing inner backend; `client/src/App.jsx`; `client/src/services/httpApi.js`; shared income layout and all draft documentation. |
| Connor, individually | Browse services, booking confirmation screen, and client booking list. Handle loading, empty results, failures, and disabled submit states. | `client/src/pages/connor`. |
| Muzzi, individually | Freelancer service list, add/edit form, delete confirmation, and received bookings. Handle loading, empty results, failures, and form validation. | `client/src/pages/muzzi`. |

Connor and Muzzi do not own the final README, screenshots, Postman collection, or video. They should test their own UI work and can extend the supplied frontend tests with help; Blake/Hamza own final verification.

## Work in parallel

1. Blake/Hamza confirm `API_CONTRACT_DRAFT.md` and the response fields.
2. Connor and Muzzi build on their separate page folders against sample data.
3. Blake/Hamza build the server against the same contract.
4. Connect each feature when its route is ready; do not wait for the entire backend.
5. Each person commits their own meaningful changes; Blake/Hamza review and merge.

## Completion checks

**Connor:** browse cards show correct details/prices; confirmation prevents repeated clicks while saving; errors are clear; a successful booking appears in the client's booking list; another client sees their own list only.

**Muzzi:** own services load; add/edit forms validate and retain entered text on failure; delete asks for confirmation; received bookings show the client and fee; another freelancer sees their own records only.

**Blake/Hamza:** actual backend enforces these rules even if a user bypasses the screens. Records survive restarts. Frontend and API tests run against the completed system. The final demo uses real login and database-backed data.
