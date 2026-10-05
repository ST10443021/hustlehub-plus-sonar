// In-memory user "store".
//
// Part 1 of the POE explicitly allows in-memory or file-based storage
// instead of a real database - a MongoDB-backed model (the "M" in MERN)
// is introduced in Part 2 (MongoDB, Inc., n.d.; IIE, 2026). This module
// isolates all data-access logic behind a small function-based interface
// so that swapping in Mongoose later only requires changes inside this
// file, not in the controllers or services that consume it.

//Author: BLAKE GODFREY - ST10435415

const { randomUUID } = require('crypto');

/** @type {Array<{id: string, email: string, passwordHash: string, role: string, createdAt: string}>} */
const users = [];

const VALID_ROLES = ['client', 'freelancer', 'admin'];

function findByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findById(id) {
  return users.find((u) => u.id === id);
}

function create({ email, passwordHash, role = 'client' }) {
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    role: VALID_ROLES.includes(role) ? role : 'client',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

/** Strip sensitive fields before a user object ever leaves the service layer. */
function toPublicUser(user) {
  if (!user) return null;
  const { id, email, role, createdAt } = user;
  return { id, email, role, createdAt };
}

module.exports = {
  VALID_ROLES,
  findByEmail,
  findById,
  create,
  toPublicUser,
  // exposed only for test scaffolding / seeding
  _store: users,
};
