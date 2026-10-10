const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');


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
      return res.status(401).json({ status: 'error', message: 'User for this token no longer exists.' });
    }

    // Attach a minimal, trusted identity to the request for downstream handlers.
    req.user = { id: user.id, role: user.role };
    req.authExpiresAt = payload.exp * 1000;
    return next();
  } catch (err) {
    if (err.statusCode === 503) return next(err);
    // Deliberately generic: do not reveal whether the token was expired,
    // malformed, or had a bad signature - all are treated as "unauthorised".
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
}

/** Role-based access control gate, layered on top of requireAuth. */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
