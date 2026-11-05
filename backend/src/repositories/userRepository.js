// User repository.
//
// MongoDB backs normal runs. Memory storage is isolated to NODE_ENV=test.
const { randomUUID } = require('crypto');
const { isDbConnected } = require('../config/db');
const UserSchema = require('../schemas/userSchema');

const VALID_ROLES = ['client', 'freelancer', 'admin'];
const PUBLIC_ROLES = ['client', 'freelancer'];

/** @type {Array<{id: string, email: string, passwordHash: string, role: string, createdAt: string}>} */
const memoryStore = [];

function toPublicUser(user) {
  if (!user) return null;
  const id = user.id || (user._id && user._id.toString());
  const { email, role, createdAt } = user;
  return { id, email, role, createdAt };
}

async function findByEmail(email) {
  const normalised = String(email).toLowerCase();
  if (isDbConnected()) {
    return UserSchema.findOne({ email: normalised }).lean({ virtuals: false }).then((doc) => (doc ? { ...doc, id: doc._id.toString() } : null));
  }
  return memoryStore.find((u) => u.email === normalised) || null;
}

async function findById(id) {
  if (isDbConnected()) {
    try {
      const doc = await UserSchema.findById(id).lean();
      return doc ? { ...doc, id: doc._id.toString() } : null;
    } catch {
      return null; // malformed ObjectId - treat as "not found", never 500
    }
  }
  return memoryStore.find((u) => u.id === id) || null;
}

async function create({ email, passwordHash, role = 'client' }) {
  const safeRole = VALID_ROLES.includes(role) ? role : 'client';
  if (isDbConnected()) {
    const doc = await UserSchema.create({ email: email.toLowerCase(), passwordHash, role: safeRole });
    return { id: doc._id.toString(), email: doc.email, role: doc.role, createdAt: doc.createdAt };
  }
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    role: safeRole,
    failedLoginAttempts: 0,
    lockUntil: null,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };
  memoryStore.push(user);
  return user;
}

/** Newest-first list of accounts for the admin view (public fields only, plus a lock flag). */
async function listAll(limit = 100) {
  const cap = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
  if (isDbConnected()) {
    const docs = await UserSchema.find({}).sort({ createdAt: -1 }).limit(cap).lean();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }
  return [...memoryStore].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, cap);
}

/** Number of accounts per role, e.g. { client: 4, freelancer: 2, admin: 1 }. */
async function countByRole() {
  const counts = { client: 0, freelancer: 0, admin: 0 };
  if (isDbConnected()) {
    const rows = await UserSchema.aggregate([{ $group: { _id: '$role', total: { $sum: 1 } } }]);
    rows.forEach((row) => { if (row._id in counts) counts[row._id] = row.total; });
    return counts;
  }
  memoryStore.forEach((u) => { counts[u.role] += 1; });
  return counts;
}

/** True while an account is inside its lockout window. */
function isLocked(user, now = new Date()) {
  return Boolean(user && user.lockUntil && new Date(user.lockUntil) > now);
}

/**
 * Records one failed sign-in. The counter is incremented atomically in MongoDB ($inc), and once it
 * reaches `maxAttempts` the account is locked until `now + lockMs` and the counter restarts, so a
 * later lock-out needs a fresh run of failures (OWASP, 2024c).
 * Returns { failedLoginAttempts, locked, lockUntil }.
 */
async function registerFailedLogin(id, { maxAttempts, lockMs }, now = new Date()) {
  if (isDbConnected()) {
    const updated = await UserSchema.findByIdAndUpdate(id, { $inc: { failedLoginAttempts: 1 } }, { new: true }).lean();
    if (!updated) return { failedLoginAttempts: 0, locked: false, lockUntil: null };
    if (updated.failedLoginAttempts >= maxAttempts) {
      const lockUntil = new Date(now.getTime() + lockMs);
      await UserSchema.updateOne({ _id: id }, { $set: { failedLoginAttempts: 0, lockUntil } });
      return { failedLoginAttempts: 0, locked: true, lockUntil };
    }
    return { failedLoginAttempts: updated.failedLoginAttempts, locked: false, lockUntil: null };
  }
  const user = memoryStore.find((u) => u.id === id);
  if (!user) return { failedLoginAttempts: 0, locked: false, lockUntil: null };
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= maxAttempts) {
    user.failedLoginAttempts = 0;
    user.lockUntil = new Date(now.getTime() + lockMs);
    return { failedLoginAttempts: 0, locked: true, lockUntil: user.lockUntil };
  }
  return { failedLoginAttempts: user.failedLoginAttempts, locked: false, lockUntil: null };
}

/** Clears the failed-login counter and any expired or active lock after a successful sign-in. */
async function clearFailedLogins(id) {
  if (isDbConnected()) {
    await UserSchema.updateOne({ _id: id }, { $set: { failedLoginAttempts: 0, lockUntil: null } });
    return;
  }
  const user = memoryStore.find((u) => u.id === id);
  if (user) { user.failedLoginAttempts = 0; user.lockUntil = null; }
}

/** Increments tokenVersion so every JWT issued before this call is rejected (server-side logout). */
async function bumpTokenVersion(id) {
  if (isDbConnected()) {
    const doc = await UserSchema.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } }, { new: true }).lean();
    return doc ? doc.tokenVersion : null;
  }
  const user = memoryStore.find((u) => u.id === id);
  if (!user) return null;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  return user.tokenVersion;
}

module.exports = {
  VALID_ROLES,
  PUBLIC_ROLES,
  findByEmail,
  findById,
  create,
  listAll,
  countByRole,
  isLocked,
  registerFailedLogin,
  clearFailedLogins,
  bumpTokenVersion,
  toPublicUser,
  _memoryStore: memoryStore, // exposed only for test scaffolding
};
