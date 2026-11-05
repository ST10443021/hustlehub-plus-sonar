const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { adminListQueryRules } = require('../middleware/validators');

const router = express.Router();

// Every admin route needs a valid token AND the admin role. Public registration cannot create
// admin accounts (see authService.registerUser), so this role is only reachable through the
// seedAdmin script (OWASP, 2021 - Broken Access Control).
router.use(requireAuth, requireRole('admin'));

router.get('/overview', adminController.getOverview);
router.get('/users', adminListQueryRules, adminController.listUsers);
router.get('/security-events', adminListQueryRules, adminController.listSecurityEvents);

module.exports = router;
