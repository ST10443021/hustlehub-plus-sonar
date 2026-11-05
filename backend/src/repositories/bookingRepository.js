// Booking repository - see userRepository.js for the rationale behind the
// dual MongoDB / in-memory backend pattern used throughout this layer.
const { randomUUID } = require('crypto');
const { isDbConnected } = require('../config/db');
const BookingSchema = require('../schemas/bookingSchema');

/** @type {Array<object>} */
const memoryStore = [];

function serialise(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  return { ...plain, id: plain.id || (plain._id && plain._id.toString()) };
}

async function create({ gigId, clientId, freelancerId, priceAtBooking, gigTitle }) {
  if (isDbConnected()) {
    const doc = await BookingSchema.create({ gigId, clientId, freelancerId, priceAtBooking, gigTitle });
    return serialise(doc);
  }
  const booking = {
    id: randomUUID(),
    gigId,
    clientId,
    freelancerId,
    priceAtBooking,
    gigTitle,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  memoryStore.push(booking);
  return booking;
}

async function findByClient(clientId) {
  if (isDbConnected()) {
    const docs = await BookingSchema.find({ clientId }).sort({ createdAt: -1 });
    return docs.map(serialise);
  }
  return memoryStore.filter((b) => b.clientId === clientId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findByFreelancer(freelancerId) {
  if (isDbConnected()) {
    const docs = await BookingSchema.find({ freelancerId }).sort({ createdAt: -1 });
    return docs.map(serialise);
  }
  return memoryStore.filter((b) => b.freelancerId === freelancerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findById(id) {
  if (isDbConnected()) {
    try {
      const doc = await BookingSchema.findById(id);
      return serialise(doc);
    } catch {
      return null;
    }
  }
  return memoryStore.find((b) => b.id === id) || null;
}

async function remove(id) {
  if (isDbConnected()) return BookingSchema.deleteOne({ _id: id });
  const index = memoryStore.findIndex((b) => b.id === id);
  if (index !== -1) memoryStore.splice(index, 1);
}

/** Total number of bookings for the admin overview. */
async function countAll() {
  if (isDbConnected()) return BookingSchema.countDocuments({});
  return memoryStore.length;
}

module.exports = { countAll, create, remove, findByClient, findByFreelancer, findById, _memoryStore: memoryStore };
