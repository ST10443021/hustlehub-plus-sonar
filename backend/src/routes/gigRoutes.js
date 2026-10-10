const express = require('express');
const gigController = require('../controllers/gigController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { gigValidationRules, gigUpdateValidationRules, gigIdValidationRules, browseValidationRules } = require('../middleware/validators');

const router = express.Router();

// Public marketplace browse - no authentication required, matching the
// "Client browsing ... of gigs" requirement (IIE, 2026b).
router.get('/', browseValidationRules, gigController.browseGigs);

// Freelancer-only routes below. requireAuth runs first (valid JWT required),
// then requireRole('freelancer') enforces the role-based access control
// the POE requires, before any gig-management logic runs (IIE, 2026b).
router.get('/mine', requireAuth, requireRole('freelancer'), gigController.listMyGigs);
router.post('/', requireAuth, requireRole('freelancer'), gigValidationRules, gigController.createGig);
router.put('/:id', requireAuth, requireRole('freelancer'), gigUpdateValidationRules, gigController.updateGig);
router.delete('/:id', requireAuth, requireRole('freelancer'), gigIdValidationRules, gigController.deleteGig);

module.exports = router;
