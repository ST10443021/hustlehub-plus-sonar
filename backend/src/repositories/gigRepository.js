// Gig repository - see userRepository.js for the rationale behind the
// dual MongoDB / in-memory backend pattern used throughout this layer.
const { randomUUID } = require('crypto');
const { isDbConnected } = require('../config/db');
const GigSchema = require('../schemas/gigSchema');

/** @type {Array<object>} */
const memoryStore = [];

function serialise(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  return { ...plain, id: plain.id || (plain._id && plain._id.toString()) };
}

async function create({ title, description, category, price, freelancerId }) {
  if (isDbConnected()) {
    const doc = await GigSchema.create({ title, description, category, price, freelancerId });
    return serialise(doc);
  }
  const gig = {
    id: randomUUID(),
    title,
    description,
    category,
    price,
    freelancerId,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.push(gig);
  return gig;
}

async function findById(id) {
  if (isDbConnected()) {
    try {
      const doc = await GigSchema.findById(id);
      return serialise(doc);
    } catch {
      return null;
    }
  }
  return memoryStore.find((g) => g.id === id) || null;
}

/** All active gigs, optionally filtered by category - the public marketplace browse view. */
async function findActive({ category } = {}) {
  if (isDbConnected()) {
    const query = { isActive: true };
    if (category) query.category = category;
    const docs = await GigSchema.find(query).sort({ createdAt: -1 });
    return docs.map(serialise);
  }
  return memoryStore
    .filter((g) => g.isActive && (!category || g.category === category))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** All gigs (active or not) belonging to one freelancer - their own management view. */
async function findByFreelancer(freelancerId) {
  if (isDbConnected()) {
    const docs = await GigSchema.find({ freelancerId }).sort({ createdAt: -1 });
    return docs.map(serialise);
  }
  return memoryStore
    .filter((g) => g.freelancerId === freelancerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function update(id, updates) {
  const allowed = ['title', 'description', 'category', 'price', 'isActive'];
  updates = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)));
  if (isDbConnected()) {
    const doc = await GigSchema.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    return serialise(doc);
  }
  const gig = memoryStore.find((g) => g.id === id);
  if (!gig) return null;
  Object.assign(gig, updates, { updatedAt: new Date().toISOString() });
  return gig;
}

async function remove(id) {
  if (isDbConnected()) {
    const result = await GigSchema.findByIdAndDelete(id);
    return Boolean(result);
  }
  const index = memoryStore.findIndex((g) => g.id === id);
  if (index === -1) return false;
  memoryStore.splice(index, 1);
  return true;
}

/** Total and active gig counts for the admin overview. */
async function countAll() {
  if (isDbConnected()) {
    const [total, active] = await Promise.all([GigSchema.countDocuments({}), GigSchema.countDocuments({ isActive: true })]);
    return { total, active };
  }
  return { total: memoryStore.length, active: memoryStore.filter((g) => g.isActive).length };
}

module.exports = { countAll, create, findById, findActive, findByFreelancer, update, remove, _memoryStore: memoryStore };
