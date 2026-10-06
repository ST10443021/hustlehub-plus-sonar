const mongoose = require('mongoose');

// A transaction record is created automatically whenever a booking is
// confirmed (payments are simulated per the POE brief) and is the single
// source of truth the income service sums over for a freelancer's
// dashboard, keeping "booking" (a marketplace event) and "transaction" (a
// financial record) as distinct, auditable concerns.
const transactionSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    freelancerId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    clientId: { type: mongoose.Schema.Types.Mixed, required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['booking_payment_simulated'], default: 'booking_payment_simulated' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
