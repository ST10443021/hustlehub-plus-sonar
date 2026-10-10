const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { logEvent } = require('../utils/eventLogger');

/**
 * Hash a plain-text password with bcrypt, an adaptive hashing algorithm
 * recommended by OWASP (at a work factor of 12 or higher) for password
 * storage (OWASP, 2024a). bcrypt automatically generates and stores a
 * unique salt per password inside the resulting hash, so no separate
 * salt column is required (OWASP, 2024a).
 * Author : SYED MUHAMMAD HAMZA KAZMI - ST10443021  
 */
async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, config.bcryptSaltRounds);
}

/**
 * Compare a plain-text password against a stored bcrypt hash using
 * bcrypt's own constant-time comparison, avoiding a timing side-channel
 * in the login flow (OWASP, 2024a).
 */
async function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

/**
 * Issue a signed JWT for an authenticated user, as specified in RFC 7519
 * (Jones, Bradley and Sakimura, 2015). The payload intentionally carries
 * only non-sensitive identifiers (id, role) - never the password hash or
 * email - since JWT payloads are base64-encoded, not encrypted, and can
 * be read by anyone holding the token (Jones, Bradley and Sakimura, 2015).
 */
function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, issuer: 'hustlehub-plus-api' }
  );
}
/** Verifies signature, issuer, and expiry on every call, per RFC 7519 (Jones, Bradley and Sakimura, 2015). */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: 'hustlehub-plus-api' });
}

async function registerUser({ email, password, role }) {
  if (role !== undefined && !userRepository.PUBLIC_ROLES.includes(role)) {
    const err = new Error('Public registration supports client and freelancer accounts only.');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    err.expose = true;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ email, passwordHash, role });
  return userRepository.toPublicUser(user);
}

async function loginUser({ email, password }) {
  // Generic failure message used for both "no such user" and "wrong password"
  // so the API never confirms or denies whether an email is registered
  // (this prevents user-enumeration attacks) (OWASP, 2021; OWASP, 2024a).
  const genericError = () => {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.expose = true;
    return err;
  };

  const user = await userRepository.findByEmail(email);
  if (!user) {
    logEvent('login_failed', { email: String(email).toLowerCase(), reason: 'no_such_account' });
    throw genericError();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    logEvent('login_failed', { email: user.email, reason: 'bad_password' });
    throw genericError();
  }

  const token = issueToken(user);
  return { token, user: userRepository.toPublicUser(user) };
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
  registerUser,
  loginUser,
};
