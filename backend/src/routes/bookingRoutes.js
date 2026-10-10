const express = require('express');
const rateLimit = require('express-rate-limit');
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { bookingValidationRules } = require('../middleware/validators');
const config = require('../config/env');

const router = express.Router();

// Booking creation is explicitly named as a "sensitive endpoint" requiring
// rate limiting in the POE brief, since it creates financial/transaction
// records (IIE, 2026b). A tighter budget than the general API limiter
// applies here specifically.
const bookingLimiter = rateLimit({
  windowMs: config.bookingRateLimitWindowMs,
  max: config.bookingRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many booking attempts. Please try again later.' },
  skip: () => config.nodeEnv === 'test', // see authRoutes.js for rationale
});

router.post('/', requireAuth, requireRole('client'), bookingLimiter, bookingValidationRules, bookingController.createBooking);
router.get('/mine', requireAuth, requireRole('client'), bookingController.listMyBookings);
router.get('/received', requireAuth, requireRole('freelancer'), bookingController.listBookingsReceived);

module.exports = router;
