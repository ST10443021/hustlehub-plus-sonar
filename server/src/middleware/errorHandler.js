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
 * (OWASP, 2021) and the POE's "secure error handling" requirement (IIE, 2026).
 *
 * Errors raised deliberately in the service layer set `err.expose = true`
 * and a safe `err.statusCode` + message; anything else is logged server-side
 * only and reduced to a generic 500 message for the client.
 * 
 * Author: MUZAMMIL CASSIM - ST10259792
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
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
