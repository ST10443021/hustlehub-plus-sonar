const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const identifierThrottle = require('../utils/identifierThrottle');
const { logEvent } = require('../utils/eventLogger');

// A real bcrypt hash of a random value, made once at start-up. When an e-mail address has no account the
// password is still compared against this hash, so "unknown address" and "wrong password" take the same
// time and the response time cannot be used to find out which addresses are registered (OWASP, 2024a; OWASP, 2024k).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), config.bcryptSaltRounds);

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
    // "tv" is the token version: a logout raises the stored version, which makes every older token invalid (OWASP, 2024e).
    { sub: user.id, role: user.role, tv: user.tokenVersion || 0 },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtExpiresIn, issuer: 'hustlehub-plus-api' }
  );
}
/** Verifies signature, issuer, and expiry on every call, per RFC 7519 (Jones, Bradley and Sakimura, 2015). */
function verifyToken(token) {
  // The accepted algorithm is pinned, so a token signed with any other algorithm is refused even if
  // the secret matches. This closes the "algorithm confusion" class of JWT attacks (Jones, Bradley and Sakimura, 2015; OWASP, 2024e).
  return jwt.verify(token, config.jwtSecret, { issuer: 'hustlehub-plus-api', algorithms: ['HS256'] });
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

/** The one 429 answer used for locked real accounts AND locked unknown addresses, so the two cannot be told apart. */
function lockedError(retryAfterSeconds) {
  const err = new Error('Too many failed sign-in attempts. This account is temporarily locked. Please try again later.');
  err.statusCode = 429;
  err.expose = true;
  err.retryAfterSeconds = retryAfterSeconds;
  return err;
}

async function loginUser({ email, password }, context = {}) {
  // Generic failure message used for both "no such user" and "wrong password"
  // so the API never confirms or denies whether an email is registered
  // (this prevents user-enumeration attacks) (OWASP, 2021; OWASP, 2024a; OWASP, 2024k).
  const genericError = () => {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.expose = true;
    return err;
  };

  // Log details may contain the e-mail address; eventLogger replaces it with a keyed hash (emailHash)
  // before anything is written, so the raw address never reaches the log (OWASP, 2024d).
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Unknown addresses follow exactly the same rules as real accounts: the same lockout after the
    // same number of failures (so a locked unknown address answers 429 like a locked real one), and
    // the same amount of password-hashing work (so the response time does not give the answer away).
    const retryAfterSeconds = identifierThrottle.lockedFor(email);
    if (retryAfterSeconds > 0) {
      logEvent('login_blocked', { email, reason: 'account_locked', ip: context.ip, requestId: context.requestId });
      throw lockedError(retryAfterSeconds);
    }
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    const state = identifierThrottle.recordFailure(email);
    logEvent('login_failed', { email, reason: 'no_such_account', ip: context.ip, requestId: context.requestId });
    if (state.locked) {
      logEvent('account_locked', { email, knownAccount: false, lockMinutes: config.lockoutMinutes, ip: context.ip, requestId: context.requestId });
    }
    throw genericError();
  }

  // Account lockout (additional security feature 1). While an account is locked the password is
  // not even checked, so a guessed password cannot unlock it early (OWASP, 2024c; Grassi et al., 2017).
  if (userRepository.isLocked(user)) {
    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(user.lockUntil) - Date.now()) / 1000));
    logEvent('login_blocked', { userId: user.id, reason: 'account_locked', ip: context.ip, requestId: context.requestId });
    throw lockedError(retryAfterSeconds);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    logEvent('login_failed', { userId: user.id, email: user.email, reason: 'bad_password', ip: context.ip, requestId: context.requestId });
    const state = await userRepository.registerFailedLogin(user.id, {
      maxAttempts: config.lockoutMaxAttempts,
      lockMs: config.lockoutMinutes * 60 * 1000,
    });
    if (state.locked) {
      logEvent('account_locked', { userId: user.id, knownAccount: true, lockMinutes: config.lockoutMinutes, ip: context.ip, requestId: context.requestId });
    }
    throw genericError();
  }

  if (user.failedLoginAttempts > 0 || user.lockUntil) await userRepository.clearFailedLogins(user.id);

  const token = issueToken(user);
  return { token, user: userRepository.toPublicUser(user) };
}

/** Server-side logout: invalidates every token issued to this user so far (additional security feature 2). */
async function logoutUser(userId) {
  return userRepository.bumpTokenVersion(userId);
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
  registerUser,
  loginUser,
  logoutUser,
};
