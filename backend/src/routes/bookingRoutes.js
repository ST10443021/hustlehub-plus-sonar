const express = require('express');
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { bookingValidationRules } = require('../middleware/validators');
const { bookingLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Booking creation is explicitly named as a "sensitive endpoint" requiring
// rate limiting in the POE brief, since it creates financial/transaction
// records (IIE, 2026b). A tighter budget than the general API limiter
// applies here specifically.
// (bookingLimiter: 10 bookings per 15 minutes per IP by default, see middleware/rateLimiters.js)

router.post('/', requireAuth, requireRole('client'), bookingLimiter, bookingValidationRules, bookingController.createBooking);
router.get('/mine', requireAuth, requireRole('client'), bookingController.listMyBookings);
router.get('/received', requireAuth, requireRole('freelancer'), bookingController.listBookingsReceived);

module.exports = router;
