const express = require('express');
const authController = require('../controllers/authController');
const { registerValidationRules, loginValidationRules } = require('../middleware/validators');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Throttles brute-force / credential-stuffing attempts against auth endpoints
// specifically (separate from the global limiter in app.js), addressing the
// "Identification and Authentication Failures" risk category (OWASP, 2021).
// Author: SYED MUHAMMAD HAMZA KAZMI - ST10443021
// (limiter defined in middleware/rateLimiters.js: 20 requests per 15 minutes per IP, logged when exceeded)

router.post('/register', authLimiter, registerValidationRules, authController.register);
router.post('/login', authLimiter, loginValidationRules, authController.login);

// Protected route demonstrating JWT validation on every request (Jones, Bradley and Sakimura, 2015).
// Logout is deliberately outside authLimiter, so a user who has used up the sign-in budget can still end a session.
router.post('/logout', requireAuth, authController.logout);

router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;
