const mongoose = require('mongoose');

// A booking links a client to a gig (and, denormalised, to that gig's
// freelancer) so both the client's "my bookings" view and the freelancer's
// "my bookings" view can be queried directly without a join, which keeps
// the ownership checks in bookingService.js a simple field comparison
// rather than a cross-collection lookup on every request.
const bookingSchema = new mongoose.Schema(
  {
    gigId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    clientId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    priceAtBooking: { type: Number, required: true, min: 0 },
    gigTitle: { type: String, default: '', maxlength: 120 },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
