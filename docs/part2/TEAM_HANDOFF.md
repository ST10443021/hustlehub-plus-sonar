# Current handoff paths

5 October 2026. Task ownership has not been split or reassigned.

| Work unit | Current paths and scope |
| --- | --- |
| Blake + Hamza together | backend/, auth/session, navigation, shared integration, income, security, final tests, README and evidence |
| Connor | frontend/src/pages/BrowseGigsPage.jsx and MyBookingsPage.jsx; client browsing, confirmation and own-booking UI |
| Muzzi | frontend/src/pages/MyGigsPage.jsx and ReceivedBookingsPage.jsx; own-gig management and received-booking UI |

The received/client booking pages reuse frontend/src/components/BookingsPage.jsx. Coordinate changes to this shared component and other shared files. The prior server/client and pages/connor/pages/muzzi starter paths do not match this uploaded implementation. Use these current paths rather than renaming files blindly.

Each person works on their lowercase first-name branch. Blake and Hamza remain one shared responsibility unit. Open a pull request into main when ready, then stop for review. No direct-main pushes, force pushes or automatic merges are included in this ZIP.
