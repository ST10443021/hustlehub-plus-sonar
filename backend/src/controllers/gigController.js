const gigService = require('../services/gigService');
const { logEvent } = require('../utils/eventLogger');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Public: browse all active gigs, optionally filtered by ?category=. */
const browseGigs = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const gigs = await gigService.listActiveGigs({ category });
  res.status(200).json({ status: 'success', message: 'Gigs retrieved.', data: { gigs } });
});

/** Freelancer-only: list the authenticated freelancer's own gigs (active or not). */
const listMyGigs = asyncHandler(async (req, res) => {
  const gigs = await gigService.listMyGigs(req.user.id);
  res.status(200).json({ status: 'success', message: 'Your gigs retrieved.', data: { gigs } });
});

/** Freelancer-only: create a new gig listing, owned by the authenticated user. */
const createGig = asyncHandler(async (req, res) => {
  const gig = await gigService.createGig(req.body, req.user.id);
  logEvent('gig_created', { gigId: gig.id, freelancerId: req.user.id });
  res.status(201).json({ status: 'success', message: 'Gig created.', data: { gig } });
});

/** Freelancer-only, ownership enforced in the service layer. */
const updateGig = asyncHandler(async (req, res) => {
  const gig = await gigService.updateGig(req.params.id, req.body, req.user.id);
  logEvent('gig_updated', { gigId: gig.id, freelancerId: req.user.id });
  res.status(200).json({ status: 'success', message: 'Gig updated.', data: { gig } });
});

/** Freelancer-only, ownership enforced in the service layer. */
const deleteGig = asyncHandler(async (req, res) => {
  await gigService.deleteGig(req.params.id, req.user.id);
  logEvent('gig_deleted', { gigId: req.params.id, freelancerId: req.user.id });
  res.status(200).json({ status: 'success', message: 'Gig deleted.', data: null });
});

module.exports = { browseGigs, listMyGigs, createGig, updateGig, deleteGig };
