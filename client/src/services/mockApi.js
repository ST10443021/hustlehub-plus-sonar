import { sampleGigs, sampleBookings, sampleTransactions } from '../data/fixtures.js';
import { validateGig } from '../lib/format.js';

// UI foundation ONLY: in-memory simulation; NOT backend security or persistence.
export function createMockApi({ latency = 100 } = {}) {
  let gigs = structuredClone(sampleGigs);
  let bookings = structuredClone(sampleBookings);
  let transactions = structuredClone(sampleTransactions);
  const result = async (fn) => {
    if (latency) await new Promise((resolve) => setTimeout(resolve, latency));
    return structuredClone(fn());
  };
  const requireRole = (user, role) => {
    if (!user || user.role !== role) throw new Error('This action is not available for this demo user.');
  };
  const ownedGig = (user, id) => {
    requireRole(user, 'freelancer');
    const gig = gigs.find((item) => item.id === id && item.active);
    if (!gig || gig.freelancerId !== user.id) throw new Error('That service is not available to this demo user.');
    return gig;
  };
  return {
    listGigs: () => result(() => gigs.filter((gig) => gig.active)),
    getMyGigs: (user) => result(() => {
      requireRole(user, 'freelancer');
      return gigs.filter((gig) => gig.active && gig.freelancerId === user.id);
    }),
    saveGig: (user, values, id) => result(() => {
      requireRole(user, 'freelancer');
      const checked = validateGig({ ...values, price: (values.priceCents / 100).toFixed(2) });
      if (Object.keys(checked.errors).length || !Number.isSafeInteger(values.priceCents)) throw new Error('Please check the service details.');
      if (id) {
        const existing = ownedGig(user, id);
        Object.assign(existing, checked.data);
        return existing;
      }
      const gig = { id: crypto.randomUUID(), ...checked.data, freelancerId: user.id, freelancerName: user.name, category: 'Services', active: true };
      gigs.push(gig);
      return gig;
    }),
    deleteGig: (user, id) => result(() => {
      // Hide the listing but retain booking snapshots for the demo.
      ownedGig(user, id).active = false;
      return { id };
    }),
    bookGig: (user, gigId) => result(() => {
      requireRole(user, 'client');
      const gig = gigs.find((item) => item.id === gigId && item.active);
      if (!gig) throw new Error('This service is no longer available.');
      const booking = { id: crypto.randomUUID(), gigId, gigTitle: gig.title, clientId: user.id, clientName: user.name, freelancerId: gig.freelancerId, freelancerName: gig.freelancerName, amountCents: gig.priceCents, currency: 'ZAR', status: 'confirmed', createdAt: new Date().toISOString() };
      const transaction = { id: crypto.randomUUID(), bookingId: booking.id, clientId: user.id, freelancerId: gig.freelancerId, amountCents: gig.priceCents, currency: 'ZAR', simulated: true, createdAt: booking.createdAt };
      bookings.push(booking);
      transactions.push(transaction);
      return { booking, transaction };
    }),
    getMyBookings: (user) => result(() => {
      if (!user || !['client', 'freelancer'].includes(user.role)) throw new Error('Select a demo client or freelancer.');
      return bookings.filter((booking) => user.role === 'client' ? booking.clientId === user.id : booking.freelancerId === user.id);
    }),
    getIncome: (user) => result(() => {
      requireRole(user, 'freelancer');
      const own = transactions.filter((transaction) => transaction.freelancerId === user.id);
      return { amountCents: own.reduce((sum, transaction) => sum + transaction.amountCents, 0), currency: 'ZAR', transactions: own };
    }),
  };
}
