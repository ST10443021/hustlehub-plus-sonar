// Booking service: encapsulates the "book a gig" workflow, which the POE
// brief requires to always result in an associated transaction record -
// payments themselves are simulated, but the resulting financial record
// is real and feeds the freelancer's income dashboard (IIE, 2026b).
const gigRepository = require('../repositories/gigRepository');
const bookingRepository = require('../repositories/bookingRepository');
const transactionRepository = require('../repositories/transactionRepository');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.expose = true;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  err.expose = true;
  return err;
}

/**
 * Creates a booking for the given gig on behalf of `clientId`, then
 * immediately creates the matching (simulated-payment) transaction record
 * in one workflow. On a transaction-write failure, remove the booking
 * before reporting failure. This compensation also works with standalone MongoDB.
 */
async function createBooking(gigId, clientId) {
  const gig = await gigRepository.findById(gigId);
  if (!gig || !gig.isActive) throw notFound('Gig not found or no longer available.');

  if (String(gig.freelancerId) === String(clientId)) {
    throw badRequest('You cannot book your own gig.');
  }

  const booking = await bookingRepository.create({
    gigId,
    clientId,
    freelancerId: gig.freelancerId,
    priceAtBooking: gig.price,
    gigTitle: gig.title,
  });

  let transaction;
  try {
    transaction = await transactionRepository.create({
      bookingId: booking.id,
      freelancerId: gig.freelancerId,
      clientId,
      amount: gig.price,
    });
  } catch (err) {
    try {
      await bookingRepository.remove(booking.id);
    } catch (cleanupError) {
      // An outage can prevent compensation. Log the ID for reconciliation;
      // this is not a multi-document MongoDB atomic transaction.
      require('../utils/eventLogger').logEvent('booking_cleanup_failed', { bookingId: booking.id });
    }
    throw err;
  }

  return { booking, transaction, gig };
}

async function listBookingsAsClient(clientId) {
  return bookingRepository.findByClient(clientId);
}

async function listBookingsAsFreelancer(freelancerId) {
  return bookingRepository.findByFreelancer(freelancerId);
}

module.exports = { createBooking, listBookingsAsClient, listBookingsAsFreelancer };
