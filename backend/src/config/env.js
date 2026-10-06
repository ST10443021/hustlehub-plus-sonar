// Centralised, validated access to environment configuration.
// Failing fast here means the app never starts in a half-configured,
// insecure state (e.g. with a missing JWT secret) (Jones, Bradley & Sakimura, 2015),
// following Node.js's recommended pattern for environment-driven configuration
// (Node.js Foundation, n.d.).

// Author : SYED MUHAMMAD HAMZA KAZMI - ST10443021
// Loads .env.test when running under Jest (NODE_ENV=test), otherwise the
// usual .env, so the test suite never depends on a developer's local
// secrets/ports and can run unattended in CI (IIE, 2026).
require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const required = ['JWT_SECRET', ...(process.env.NODE_ENV === 'test' ? [] : ['MONGODB_URI'])];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace_this')) {
  console.error('JWT_SECRET must be a new random secret of at least 32 characters.');
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5443,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  sslKeyPath: process.env.SSL_KEY_PATH || './certs/key.pem',
  sslCertPath: process.env.SSL_CERT_PATH || './certs/cert.pem',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  // --- Part 2 additions ---
  // MongoDB is required for normal runs; memory repositories are test-only.
  mongoUri: process.env.MONGODB_URI || '',
  // Only the controlled nginx proxy should set forwarded request IPs.
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,

  // Comma-separated list of allowed frontend origins for CORS, tightened
  // per OWASP's guidance against permissive wildcard origins once
  // credentials/tokens are in play (OWASP, 2021).
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),

  // Separate, stricter rate-limit budget for booking creation, since
  // booking endpoints create financial/transaction records and are a
  // POE-specified sensitive endpoint (IIE, 2026).
  bookingRateLimitWindowMs: parseInt(process.env.BOOKING_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  bookingRateLimitMax: parseInt(process.env.BOOKING_RATE_LIMIT_MAX, 10) || 10,

  // Illustrative freelancer income-tax bracket table for the 2026/27 South
  // African tax year (1 March 2026 - 28 February 2027 - the tax year
  // current as at the time of writing), reproducing SARS's published
  // individual marginal tax brackets and primary rebate (SARS, 2026). Used
  // only to produce an *estimated* annualised tax figure for a simulated
  // marketplace dashboard - clearly labelled as an estimate, not
  // professional tax advice, wherever it is surfaced in the API/UI.
  taxBrackets: [
    { upTo: 245100, rate: 0.18, base: 0 },
    { upTo: 383100, rate: 0.26, base: 44118 },
    { upTo: 530200, rate: 0.31, base: 79998 },
    { upTo: 695800, rate: 0.36, base: 125599 },
    { upTo: 887000, rate: 0.39, base: 185215 },
    { upTo: 1878600, rate: 0.41, base: 259783 },
    { upTo: Infinity, rate: 0.45, base: 666339 },
  ],
  taxPrimaryRebate: 17820, // SARS (2026) primary rebate, under-65 taxpayers, 2026/27 tax year
};
