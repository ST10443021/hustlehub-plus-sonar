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
    createdAt: new Date().toISOString(),
  };
  memoryStore.push(user);
  return user;
}

module.exports = {
  VALID_ROLES,
  PUBLIC_ROLES,
  findByEmail,
  findById,
  create,
  toPublicUser,
  _memoryStore: memoryStore, // exposed only for test scaffolding
};
