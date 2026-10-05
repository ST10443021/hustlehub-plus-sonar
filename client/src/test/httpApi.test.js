import { expect, it, vi } from 'vitest';
import { createHttpApi } from '../services/httpApi.js';

it('sends only a gig ID when booking; the backend must choose the fee', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'success', data: { booking: { id: 'b1' }, transaction: { id: 't1' } } }) });
  const api = createHttpApi({ baseUrl: 'https://localhost:5443', getToken: () => 'test-token', fetchImpl });
  await api.bookGig({ id: 'untrusted-browser-user' }, 'g1');
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url).toBe('https://localhost:5443/api/bookings');
  expect(options.headers.Authorization).toBe('Bearer test-token');
  expect(JSON.parse(options.body)).toEqual({ gigId: 'g1' });
});

it('shows a safe error instead of exposing server internals or falling back to mock data', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: '/private/server.js stack trace' }) });
  const api = createHttpApi({ baseUrl: 'https://localhost:5443', getToken: () => 'test-token', fetchImpl });
  await expect(api.getMyBookings()).rejects.toThrow('Something went wrong. Please try again.');
});

it('does not call a protected API without a token', async () => {
  const fetchImpl = vi.fn();
  const api = createHttpApi({ baseUrl: 'https://localhost:5443', getToken: () => '', fetchImpl });
  await expect(api.getMyBookings()).rejects.toThrow('Please log in to continue.');
  expect(fetchImpl).not.toHaveBeenCalled();
});
