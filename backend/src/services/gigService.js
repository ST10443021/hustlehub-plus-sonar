// Gig service: owns all gig-related business rules so that controllers
// stay thin (HTTP <-> service translation only), matching the layering
// established for authentication in Part 1 (IIE, 2026).
const gigRepository = require('../repositories/gigRepository');

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  err.expose = true;
  return err;
}

function notFound(message = 'Gig not found.') {
  const err = new Error(message);
  err.statusCode = 404;
  err.expose = true;
  return err;
}

async function createGig({ title, description, category, price }, freelancerId) {
  return gigRepository.create({ title, description, category, price, freelancerId });
}

async function listActiveGigs({ category } = {}) {
  return gigRepository.findActive({ category });
}

async function listMyGigs(freelancerId) {
  return gigRepository.findByFreelancer(freelancerId);
}

async function getGigOrThrow(gigId) {
  const gig = await gigRepository.findById(gigId);
  if (!gig) throw notFound();
  return gig;
}

/**
 * Enforces that only the owning freelancer can update or delete a gig -
 * the core "users must not be able to modify, delete, or access resources
 * that do not belong to them" requirement for this part of the POE (IIE,
 * 2026), implementing OWASP's Broken Access Control guidance that object-
 * level ownership must be re-checked on every request, not only at
 * creation time (OWASP, 2021).
 */
function assertOwnership(gig, requestingUserId) {
  if (String(gig.freelancerId) !== String(requestingUserId)) {
    throw forbidden('You do not have permission to modify this gig.');
  }
}

async function updateGig(gigId, updates, requestingUserId) {
  const allowed = ['title', 'description', 'category', 'price', 'isActive'];
  if (Object.keys(updates).some((key) => !allowed.includes(key))) {
    const err = new Error('Only gig details can be changed. Ownership and IDs cannot be changed.');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
  const gig = await getGigOrThrow(gigId);
  assertOwnership(gig, requestingUserId);
  return gigRepository.update(gigId, updates);
}

async function deleteGig(gigId, requestingUserId) {
  const gig = await getGigOrThrow(gigId);
  assertOwnership(gig, requestingUserId);
  await gigRepository.remove(gigId);
}

module.exports = { createGig, listActiveGigs, listMyGigs, getGigOrThrow, updateGig, deleteGig, assertOwnership };
