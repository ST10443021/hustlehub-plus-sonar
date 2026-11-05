// Centralised, validated access to environment configuration.
// Failing fast here means the app never starts in a half-configured,
// insecure state (e.g. with a missing JWT secret) (Jones, Bradley and Sakimura, 2015),
// following Node.js's recommended pattern for environment-driven configuration
// (Node.js Foundation, n.d.).

// Author : SYED MUHAMMAD HAMZA KAZMI - ST10443021
// Loads .env.test when running under Jest (NODE_ENV=test), otherwise the
// usual .env, so the test suite never depends on a developer's local
// secrets/ports and can run unattended in CI (IIE, 2026b).
require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const required = ['JWT_SECRET', ...(process.env.NODE_ENV === 'test' ? [] : ['MONGODB_URI'])];
// eslint-disable-next-line security/detect-object-injection -- keys come from the fixed "required" list above, never from input
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
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
  // POE-specified sensitive endpoint (IIE, 2026b).
  bookingRateLimitWindowMs: parseInt(process.env.BOOKING_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  bookingRateLimitMax: parseInt(process.env.BOOKING_RATE_LIMIT_MAX, 10) || 10,

  // --- Part 3 additions ---
  // Directory for the local structured event log. Overridable so a container can mount a volume here.
  logDir: process.env.LOG_DIR || require('path').resolve(__dirname, '..', '..', 'logs'),

  // Optional Azure custom-event delivery. Copy the FULL connection string from the resource
  // Overview. Azure takes precedence over the legacy HTTP settings when this is supplied.
  applicationInsightsConnectionString: (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '').trim(),

  // Optional cloud log shipping over HTTPS (Better Stack Logs or any HTTPS JSON log-ingest endpoint).
  // Both values must be set to enable it. A plain http:// URL is refused so log data is never sent
  // unencrypted (OWASP, 2021; Better Stack, n.d.).
  logCloudUrl: /^https:\/\//i.test(process.env.LOG_CLOUD_URL || '') ? process.env.LOG_CLOUD_URL : '',
  logCloudToken: process.env.LOG_CLOUD_TOKEN || '',

  // Account lockout: after this many consecutive failed sign-ins the account is locked for a
  // fixed period, which slows online password guessing per account as well as per IP address
  // (OWASP, 2024c; Grassi et al., 2017).
  lockoutMaxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS, 10) || 5,
  lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES, 10) || 15,

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

  // Income below this amount produces R0 tax because the primary rebate wipes out
  // the first-bracket tax: R17,820 / 18% = R99,000, matching SARS's published
  // under-65 tax threshold for the 2026/27 tax year (SARS, 2026). Derived, not
  // hard-coded, so it can never drift away from the bracket table above.
  get taxFreeThreshold() {
    return this.taxPrimaryRebate / this.taxBrackets[0].rate;
  },
  // South African tax years run from 1 March to the end of February (SARS, 2026),
  // and South Africa is UTC+2 all year (no daylight saving).
  taxYearStartMonth: 2, // 0-based month index: March
  localUtcOffsetHours: 2,
};
