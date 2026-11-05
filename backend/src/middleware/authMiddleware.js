const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { logEvent } = require('../utils/eventLogger');


/**
 * Protects a route by requiring a valid, non-expired JWT in the
 * Authorization header (Bearer scheme), per RFC 7519 (Jones, Bradley
 * & Sakimura, 2015). Runs on every request to a protected endpoint -
 * tokens are never trusted once and cached (IIE, 2026b).
 * Author: SYED MUHAMMAD HAMZA KAZMI - ST10443021
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    logEvent('token_rejected', { reason: 'missing_or_malformed', path: req.originalUrl.split('?')[0], ip: req.ip, requestId: req.id });
    return res.status(401).json({
      status: 'error',
      message: 'Authentication token missing or malformed.',
    });
  }

  try {
    const payload = authService.verifyToken(token);
    const user = await userRepository.findById(payload.sub);
    // Deliberately generic: do not reveal whether the token was expired,
    // malformed, or had a bad signature - all are treated as "unauthorised",
    // avoiding information leakage that could assist an attacker (OWASP, 2021).
    if (!user) {
      logEvent('token_rejected', { reason: 'unknown_user', ip: req.ip, requestId: req.id });
      return res.status(401).json({ status: 'error', message: 'User for this token no longer exists.' });
    }

    // Token revocation (additional security feature 2): a token whose version is older than the
    // stored one was issued before a logout, so it is refused even though its signature is valid.
    if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
      logEvent('token_rejected', { reason: 'revoked', userId: user.id, ip: req.ip, requestId: req.id });
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
    }

    // Attach a minimal, trusted identity to the request for downstream handlers.
    req.user = { id: user.id, role: user.role };
    req.authExpiresAt = payload.exp * 1000;
    return next();
  } catch (err) {
    if (err.statusCode === 503) return next(err);
    logEvent('token_rejected', { reason: 'invalid_signature_or_expired', ip: req.ip, requestId: req.id });
    // Deliberately generic: do not reveal whether the token was expired,
    // malformed, or had a bad signature - all are treated as "unauthorised".
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
}

/** Role-based access control gate, layered on top of requireAuth. */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logEvent('access_denied', { userId: req.user ? req.user.id : undefined, role: req.user ? req.user.role : undefined, method: req.method, path: req.originalUrl.split('?')[0], ip: req.ip, requestId: req.id });
      return res.status(403).json({ status: 'error', message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
