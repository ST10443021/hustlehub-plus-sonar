// Transaction repository - see userRepository.js for the rationale behind
// the dual MongoDB / in-memory backend pattern used throughout this layer.
const { randomUUID } = require('crypto');
const { isDbConnected } = require('../config/db');
const TransactionSchema = require('../schemas/transactionSchema');

/** @type {Array<object>} */
const memoryStore = [];

function serialise(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  return { ...plain, id: plain.id || (plain._id && plain._id.toString()) };
}

async function create({ bookingId, freelancerId, clientId, amount }) {
  if (isDbConnected()) {
    const doc = await TransactionSchema.create({ bookingId, freelancerId, clientId, amount, type: 'booking_payment_simulated' });
    return serialise(doc);
  }
  const transaction = {
    id: randomUUID(),
    bookingId,
    freelancerId,
    clientId,
    amount,
    type: 'booking_payment_simulated',
    createdAt: new Date().toISOString(),
  };
  memoryStore.push(transaction);
  return transaction;
}

/** Every transaction (i.e. every simulated payment received) for one freelancer - the basis of income tracking. */
async function findByFreelancer(freelancerId) {
  if (isDbConnected()) {
    const docs = await TransactionSchema.find({ freelancerId }).sort({ createdAt: -1 });
    return docs.map(serialise);
  }
  return memoryStore.filter((t) => t.freelancerId === freelancerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = { create, findByFreelancer, _memoryStore: memoryStore };
