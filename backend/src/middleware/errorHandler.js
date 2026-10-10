const config = require('../config/env');

/** Catches unmatched routes and forwards a clean 404 into the error handler. */
function notFoundHandler(req, res, next) {
  const err = new Error('Resource not found.');
  err.statusCode = 404;
  err.expose = true;
  next(err);
}

/**
 * * Centralised error handler - the single place responses are generated
 * for thrown/forwarded errors. This guarantees no stack trace, file path,
 * SQL/driver message, or other internal detail ever reaches the client,
 * satisfying both OWASP's guidance against verbose error messages
 * (OWASP, 2021) and the POE's "secure error handling" requirement (IIE, 2026b).
 *
 * Errors raised deliberately in the service layer set `err.expose = true`
 * and a safe `err.statusCode` + message; anything else is logged server-side
 * only and reduced to a generic 500 message for the client.
 * 
 * Author: MUZAMMIL CASSIM - ST10259792
 */
/**
 * Maps known Mongoose/MongoDB driver error shapes to safe, user-facing
 * equivalents of the same `{ statusCode, message, expose }` contract used
 * by deliberately-thrown service errors, so a database-layer failure never
 * surfaces a raw driver message, collection name, or connection string to
 * the client (OWASP, 2021; MongoDB, Inc., n.d.).
 */
function normaliseDbError(err) {
  if (err.name === 'ValidationError') {
    return { statusCode: 400, message: 'Validation failed.', expose: true };
  }
  if (err.code === 11000) {
    return { statusCode: 409, message: 'A record with these details already exists.', expose: true };
  }
  if (err.name === 'CastError') {
    return { statusCode: 400, message: 'Invalid identifier supplied.', expose: true };
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    err.statusCode = err.type === 'entity.too.large' ? 413 : 400;
    err.message = err.type === 'entity.too.large' ? 'Request is too large.' : 'Request contains invalid JSON.';
    err.expose = true;
  }
  const dbError = normaliseDbError(err);
  if (dbError) Object.assign(err, dbError);

  const statusCode = err.expose && err.statusCode ? err.statusCode : 500;
  const message = err.expose ? err.message : 'An unexpected error occurred. Please try again later.';

  // Full detail goes to server-side logs only, never in the HTTP response.
  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode}`, config.nodeEnv === 'development' ? err.stack : err.message);

  res.status(statusCode).json({
    status: 'error',
    message,
  });
}

module.exports = { notFoundHandler, errorHandler };
