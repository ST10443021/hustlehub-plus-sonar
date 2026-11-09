// Structured, append-only security and business event log.
//
// What is recorded (see the README "Logging and monitoring" section for the reasons):
//  - authentication: registrations, successful and failed logins, lockouts, logouts, rejected tokens
//  - authorisation: requests refused because the caller's role was not allowed
//  - bookings and transactions: every booking and its simulated payment record
//  - gigs: creation, update and deletion
//  - security controls: rate-limit rejections
//  - system: unhandled server errors and failed clean-ups
//
// Each entry is one JSON line with a timestamp, severity level and category, which makes it easy
// to search and alert on (OWASP, 2024d). Entries go to three places:
//  1. a local file (logs/events.log), rotated when it grows large;
//  2. standard output when running in production, which is where container platforms collect logs
//     (Wiggins, 2017);
//  3. an optional cloud log platform (see cloudLogger.js).
//
// Passwords, password hashes, tokens and raw request bodies are never logged. Any field whose name
// looks sensitive is replaced with [REDACTED], e-mail addresses are replaced by a keyed hash
// (emailHash, see pseudonymise.js), long values are truncated, and database connection
// credentials are masked, so the log cannot become a new source of data leakage (OWASP, 2021;
// OWASP, 2024d; Republic of South Africa, 2013).
/* eslint-disable security/detect-non-literal-fs-filename --
   Every path in this file is built from config.logDir, an operator-supplied environment setting
   (LOG_DIR), plus the fixed file name "events.log". No request data ever reaches a file path. */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const config = require('../config/env');
const cloudLogger = require('./cloudLogger');
const { pseudonymise } = require('./pseudonymise');

const logFile = path.join(config.logDir, 'events.log');
const MAX_FILE_BYTES = 5 * 1024 * 1024; // rotate at 5 MB
const MAX_VALUE_LENGTH = 500;
const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|hash|cookie|credential/i;
const EMAIL_KEY = /e-?mail/i;

const CATEGORY_BY_EVENT = new Map(Object.entries({
  user_registered: 'auth', user_login: 'auth', login_failed: 'auth', login_blocked: 'auth',
  account_locked: 'security', user_logout: 'auth', token_rejected: 'security',
  access_denied: 'security', rate_limit_exceeded: 'security', admin_access: 'security',
  booking_created: 'booking', transaction_created: 'transaction', booking_cleanup_failed: 'system', server_started: 'system', server_stopping: 'system',
  gig_created: 'gig', gig_updated: 'gig', gig_deleted: 'gig', server_error: 'system', http_request: 'http',
}));
const WARN_EVENTS = new Set(['login_failed', 'login_blocked', 'account_locked', 'token_rejected', 'access_denied', 'rate_limit_exceeded']);
const ERROR_EVENTS = new Set(['server_error', 'booking_cleanup_failed']);

function levelFor(eventType) {
  if (ERROR_EVENTS.has(eventType)) return 'error';
  if (WARN_EVENTS.has(eventType)) return 'warn';
  return 'info';
}

/** Masks credentials embedded in connection strings, e.g. mongodb://user:pass@host. */
function maskSecrets(text) {
  return text.replace(/:\/\/[^/@\s:]+:[^/@\s]+@/g, '://[REDACTED]@');
}

/** Makes one value safe to write to a log. */
function sanitiseValue(key, value) {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') {
    const masked = maskSecrets(value);
    return masked.length > MAX_VALUE_LENGTH ? `${masked.slice(0, MAX_VALUE_LENGTH)}...` : masked;
  }
  if (value !== null && typeof value === 'object') return '[object]'; // nested objects could hide sensitive data
  return value;
}

/**
 * Returns a copy of `details` that is safe to write to a log. Object.fromEntries creates plain own
 * properties, so a key such as "__proto__" cannot change the object's prototype (OWASP, 2021).
 */
function sanitise(details) {
  return Object.fromEntries(
    Object.entries(details || {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => (
        // E-mail addresses are personal information (POPIA) and are sometimes mistyped passwords, so any
        // field named like an e-mail is replaced by a keyed hash and stored under "<name>Hash".
        EMAIL_KEY.test(key) && typeof value === 'string'
          ? [`${key}Hash`, pseudonymise(value)]
          : [key, sanitiseValue(key, value)]
      ))
  );
}

function rotateIfLarge() {
  try {
    if (fs.statSync(logFile).size >= MAX_FILE_BYTES) fs.renameSync(logFile, `${logFile}.1`);
  } catch {
    // the file does not exist yet, which is fine
  }
}

/** Appends one structured event. Never throws, because logging must never break a request. */
function logEvent(eventType, details = {}) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      level: levelFor(eventType),
      category: CATEGORY_BY_EVENT.get(eventType) || 'app',
      event: eventType,
      ...sanitise(details),
    };
    const line = JSON.stringify(entry);

    if (config.nodeEnv !== 'test' || process.env.LOG_TO_FILE_IN_TESTS === '1') {
      fs.mkdirSync(config.logDir, { recursive: true });
      rotateIfLarge();
      fs.appendFileSync(logFile, `${line}\n`);
    }
    if (config.nodeEnv === 'production') {
      process.stdout.write(`${line}\n`);
    } else if (config.nodeEnv !== 'test') {
      console.log(`[event] ${eventType}`, sanitise(details));
    }

    // Cloud platforms expect "dt" and "message" (Better Stack, n.d.).
    const { timestamp, event, ...rest } = entry;
    cloudLogger.enqueue({ dt: timestamp, message: event, ...rest });
  } catch (err) {
    console.error('Failed to write event log entry:', err.message);
  }
}

/**
 * Reads the newest entries from the local log for the admin security view.
 * Only the tail of the file is read so a large log cannot exhaust memory.
 */
function readRecentEvents({ limit = 50, categories } = {}) {
  try {
    const fd = fs.openSync(logFile, 'r');
    try {
      const { size } = fs.fstatSync(fd);
      const length = Math.min(size, 512 * 1024);
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, size - length);
      const events = [];
      for (const line of buffer.toString('utf8').split('\n')) {
        if (!line) continue;
        try {
          const entry = JSON.parse(line);
          if (!categories || categories.includes(entry.category)) events.push(entry);
        } catch {
          // the first line of the tail can be cut in half; skip anything that is not valid JSON
        }
      }
      return events.slice(-limit).reverse();
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

/**
 * Gives every request an ID (also returned as X-Request-Id so a user's error can be matched to the
 * log) and records completed requests to authentication, booking and admin endpoints.
 */
function requestLogger(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    if (/^\/api\/(auth|bookings|admin)/.test(req.originalUrl)) {
      logEvent('http_request', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Number((process.hrtime.bigint() - started) / 1000000n),
        ip: req.ip,
        userId: req.user ? req.user.id : undefined,
      });
    }
  });
  next();
}

module.exports = { logEvent, requestLogger, readRecentEvents, sanitise };