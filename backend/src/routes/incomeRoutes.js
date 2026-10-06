const express = require('express');
const incomeController = require('../controllers/incomeController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('freelancer'), incomeController.getMyIncomeSummary);

module.exports = router;
