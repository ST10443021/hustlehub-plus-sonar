const mongoose = require('mongoose');

// A gig is owned by exactly one freelancer. `freelancerId` is the field
// every ownership check in gigService.js / bookingService.js relies on, so
// that clients and other freelancers can never modify a listing that is
// not theirs (OWASP, 2021 - Broken Access Control, A01:2021).
const gigSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    freelancerId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Gig || mongoose.model('Gig', gigSchema);
