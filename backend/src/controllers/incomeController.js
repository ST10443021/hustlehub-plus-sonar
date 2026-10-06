const incomeService = require('../services/incomeService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Freelancer-only: income earned and estimated tax, for the dashboard. */
const getMyIncomeSummary = asyncHandler(async (req, res) => {
  const summary = await incomeService.getIncomeSummary(req.user.id);
  res.status(200).json({ status: 'success', message: 'Income summary retrieved.', data: summary });
});

module.exports = { getMyIncomeSummary };
