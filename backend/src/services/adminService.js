// Administrator read-only views: platform totals, accounts and recent security events.
//
// These give the admin role capabilities that are genuinely different from clients and freelancers
// (separation of duties), and they let an administrator watch for attacks without database access
// (OWASP, 2021; OWASP, 2024d). Nothing here can change or delete data, and password hashes and
// the security counters are never included in the output.
const userRepository = require('../repositories/userRepository');
const gigRepository = require('../repositories/gigRepository');
const bookingRepository = require('../repositories/bookingRepository');
const transactionRepository = require('../repositories/transactionRepository');
const { readRecentEvents } = require('../utils/eventLogger');

async function getOverview() {
  const [users, gigs, bookings, transactions] = await Promise.all([
    userRepository.countByRole(),
    gigRepository.countAll(),
    bookingRepository.countAll(),
    transactionRepository.totals(),
  ]);
  return {
    users: { ...users, total: users.client + users.freelancer + users.admin },
    gigs,
    bookings,
    transactions,
    currency: 'ZAR',
    generatedAt: new Date().toISOString(),
  };
}

async function listUsers(limit) {
  const users = await userRepository.listAll(limit);
  return users.map((u) => ({ ...userRepository.toPublicUser(u), locked: userRepository.isLocked(u) }));
}

/** Newest-first authentication, authorisation and rate-limit events from the local log. */
function listSecurityEvents(limit) {
  const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  return readRecentEvents({ limit: cap, categories: ['auth', 'security'] });
}

module.exports = { getOverview, listUsers, listSecurityEvents };
