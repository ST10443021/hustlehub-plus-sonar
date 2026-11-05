// One place to build every rate limiter, so all of them answer in the same JSON shape, send the
// standard RateLimit headers and, importantly, leave a log entry when someone is turned away.
// Repeated rate_limit_exceeded events from one address are a typical sign of brute-force or
// scraping activity (OWASP, 2021; OWASP, 2024d).
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { logEvent } = require('../utils/eventLogger');

/**
 * @param {string} name       short label written to the log, e.g. "auth"
 * @param {number} windowMs   length of the counting window in milliseconds
 * @param {number} max        requests allowed per window per client address
 * @param {string} message    text returned to the client when the limit is hit
 */
function buildLimiter({ name, windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logEvent('rate_limit_exceeded', { limiter: name, method: req.method, path: req.originalUrl.split('?')[0], ip: req.ip });
      res.status(429).json({ status: 'error', message });
    },
    // The Jest suite runs hundreds of requests from one address, so limiting is skipped only when
    // NODE_ENV=test. Postman/Newman exercises the real limits against a running server.
    skip: () => config.nodeEnv === 'test',
  });
}

const globalLimiter = buildLimiter({ name: 'global', windowMs: 15 * 60 * 1000, max: 300, message: 'Too many requests. Please try again later.' });
const authLimiter = buildLimiter({ name: 'auth', windowMs: 15 * 60 * 1000, max: 20, message: 'Too many attempts. Please try again later.' });
const bookingLimiter = buildLimiter({ name: 'booking', windowMs: config.bookingRateLimitWindowMs, max: config.bookingRateLimitMax, message: 'Too many booking attempts. Please try again later.' });

module.exports = { buildLimiter, globalLimiter, authLimiter, bookingLimiter };
