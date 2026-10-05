import { describe, expect, it } from 'vitest';
import { createMockApi } from '../services/mockApi.js';
import { demoUsers } from '../data/fixtures.js';

describe('sample-data foundation (not backend security evidence)', () => {
  it('records a booking and the same fee for the correct freelancer', async () => {
    const api = createMockApi({ latency: 0 });
    const before = await api.getIncome(demoUsers[2]);
    const { booking, transaction } = await api.bookGig(demoUsers[0], 'gig-social');
    expect(booking.freelancerId).toBe(demoUsers[2].id);
    expect(transaction.bookingId).toBe(booking.id);
    expect(transaction.amountCents).toBe(65000);
    expect((await api.getIncome(demoUsers[2])).amountCents).toBe(before.amountCents + 65000);
  });
  it('keeps sample clients and freelancer records separate', async () => {
    const api = createMockApi({ latency: 0 });
    expect((await api.getMyBookings(demoUsers[0])).every((item) => item.clientId === demoUsers[0].id)).toBe(true);
    expect((await api.getMyGigs(demoUsers[2])).every((item) => item.freelancerId === demoUsers[2].id)).toBe(true);
    await expect(api.deleteGig(demoUsers[3], 'gig-logo')).rejects.toThrow();
    await expect(api.bookGig(demoUsers[2], 'gig-logo')).rejects.toThrow();
  });
  it('removes a sample listing while retaining earlier booking details', async () => {
    const api = createMockApi({ latency: 0 });
    await api.deleteGig(demoUsers[2], 'gig-logo');
    expect((await api.listGigs()).some((item) => item.id === 'gig-logo')).toBe(false);
    expect((await api.getMyBookings(demoUsers[0]))[0].gigTitle).toBe('A logo for your next big idea');
    await expect(api.bookGig(demoUsers[0], 'gig-logo')).rejects.toThrow('no longer available');
  });
});
