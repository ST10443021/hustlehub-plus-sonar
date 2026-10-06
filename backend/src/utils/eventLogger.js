// Structured, append-only event log for security- and business-relevant
// events (registration, login, gig created/updated/deleted, booking
// created). This satisfies the overall "logging of key system events"
// requirement (IIE, 2026) at a level appropriate for Part 2; Part 3's
// DevSecOps stage is expected to forward this to a centralised, monitored
// log store rather than a local file (IIE, 2026).
//
// Logs are deliberately free of password hashes, JWTs, or raw request
// bodies - only identifiers and outcomes are recorded - so the log file
// itself never becomes a new source of sensitive-data leakage (OWASP, 2021).
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const logDir = path.resolve(__dirname, '..', '..', 'logs');
const logFile = path.join(logDir, 'events.log');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
}

/** Appends one structured event line. Never throws - logging must never break a request. */
function logEvent(eventType, details = {}) {
  try {
    ensureLogDir();
    const entry = { timestamp: new Date().toISOString(), event: eventType, ...details };
    fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
    if (config.nodeEnv !== 'production' && config.nodeEnv !== 'test') {
      // eslint-disable-next-line no-console
      console.log(`[event] ${eventType}`, details);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write event log entry:', err.message);
  }
}

/** Express middleware that logs completed requests to protected/sensitive endpoints. */
function requestLogger(req, res, next) {
  res.on('finish', () => {
    const sensitive = /\/api\/(auth|bookings)/.test(req.originalUrl);
    if (sensitive) {
      logEvent('http_request', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        userId: req.user ? req.user.id : undefined,
      });
    }
  });
  next();
}

module.exports = { logEvent, requestLogger };
