const bookingService = require('../services/bookingService');
const { logEvent } = require('../utils/eventLogger');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Client-only: book a gig, which also creates the associated (simulated-payment) transaction record. */
const createBooking = asyncHandler(async (req, res) => {
  const { gigId } = req.body;
  const { booking, transaction, gig } = await bookingService.createBooking(gigId, req.user.id);
  logEvent('booking_created', { requestId: req.id, bookingId: booking.id, gigId: gig.id, clientId: req.user.id, freelancerId: gig.freelancerId, transactionId: transaction.id });
  logEvent('transaction_created', { transactionId: transaction.id, bookingId: booking.id, clientId: req.user.id, freelancerId: gig.freelancerId, amount: transaction.amount, requestId: req.id });
  res.status(201).json({
    status: 'success',
    message: 'Booking confirmed (payment simulated).',
    data: { booking, transaction, gig: { id: gig.id, title: gig.title, price: gig.price } },
  });
});

/** Client-only: the authenticated client's own booking history. */
const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listBookingsAsClient(req.user.id);
  res.status(200).json({ status: 'success', message: 'Your bookings retrieved.', data: { bookings } });
});

/** Freelancer-only: bookings made against the authenticated freelancer's gigs. */
const listBookingsReceived = asyncHandler(async (req, res) => {
  const bookings = await bookingService.listBookingsAsFreelancer(req.user.id);
  res.status(200).json({ status: 'success', message: 'Bookings received retrieved.', data: { bookings } });
});

module.exports = { createBooking, listMyBookings, listBookingsReceived };
