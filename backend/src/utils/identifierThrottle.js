// Sign-in failure counter for e-mail addresses that have NO account.
//
// Why it exists: account lockout answers 429 for a real, locked account. If an unknown address kept
// answering 401 forever, the difference between 429 and 401 would tell an attacker which addresses are
// registered (user enumeration). Applying the same lockout rule to unknown addresses makes both cases
// behave identically: five failures, then 429 for the lock period (OWASP, 2024c; OWASP, 2024k).
//
// Only a salted-free SHA-256 of the lower-cased address is kept as the map key, never the address.
// The table is bounded (least recently used entries are evicted first), so an attacker sending random
// addresses cannot grow memory without limit. Like the rate limiters, the counters live in this API
// process; a shared store such as Redis would be needed to share them between several instances.
const crypto = require('crypto');
const config = require('../config/env');

const MAX_TRACKED = 5000;

/** @type {Map<string, {failures: number, lockUntil: number, touched: number}>} insertion order = least recently used first */
const entries = new Map();

const keyFor = (identifier) => crypto.createHash('sha256').update(String(identifier).trim().toLowerCase()).digest('hex');
const lockMs = () => config.lockoutMinutes * 60 * 1000;

function evictIfNeeded(nowMs) {
  if (entries.size <= MAX_TRACKED) return;
  for (const [key, entry] of entries) {
    if (entries.size <= MAX_TRACKED) return;
    if (entry.lockUntil <= nowMs) entries.delete(key); // expired or never locked: safe to forget
  }
  for (const key of entries.keys()) {
    if (entries.size <= MAX_TRACKED) return;
    entries.delete(key); // still too many live locks: drop the least recently used
  }
}

/** Seconds left on the lock for this address, or 0 when it is not locked. */
function lockedFor(identifier, nowMs = Date.now()) {
  const entry = entries.get(keyFor(identifier));
  if (!entry || entry.lockUntil <= nowMs) return 0;
  return Math.max(1, Math.ceil((entry.lockUntil - nowMs) / 1000));
}

/** Records one failed sign-in. Mirrors userRepository.registerFailedLogin: the counter restarts when the lock starts. */
function recordFailure(identifier, nowMs = Date.now()) {
  const key = keyFor(identifier);
  const entry = entries.get(key) || { failures: 0, lockUntil: 0, touched: nowMs };
  entry.failures += 1;
  entry.touched = nowMs;
  let locked = false;
  if (entry.failures >= config.lockoutMaxAttempts) {
    entry.failures = 0;
    entry.lockUntil = nowMs + lockMs();
    locked = true;
  }
  entries.delete(key);
  entries.set(key, entry); // move to the most recently used end
  evictIfNeeded(nowMs);
  return { locked, lockUntil: entry.lockUntil };
}

/** Test helper. */
function reset() {
  entries.clear();
}

module.exports = { lockedFor, recordFailure, reset, MAX_TRACKED, _size: () => entries.size };
