const adminService = require('../services/adminService');
const { logEvent } = require('../utils/eventLogger');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Admin-only: platform totals. */
const getOverview = asyncHandler(async (req, res) => {
  logEvent('admin_access', { userId: req.user.id, resource: 'overview', requestId: req.id });
  const overview = await adminService.getOverview();
  res.status(200).json({ status: 'success', message: 'Platform overview retrieved.', data: overview });
});

/** Admin-only: registered accounts (public fields only). */
const listUsers = asyncHandler(async (req, res) => {
  logEvent('admin_access', { userId: req.user.id, resource: 'users', requestId: req.id });
  const users = await adminService.listUsers(req.query.limit);
  res.status(200).json({ status: 'success', message: 'Users retrieved.', data: { users } });
});

/** Admin-only: recent authentication and security events. */
const listSecurityEvents = asyncHandler(async (req, res) => {
  logEvent('admin_access', { userId: req.user.id, resource: 'security-events', requestId: req.id });
  const events = adminService.listSecurityEvents(req.query.limit);
  res.status(200).json({ status: 'success', message: 'Security events retrieved.', data: { events } });
});

module.exports = { getOverview, listUsers, listSecurityEvents };
