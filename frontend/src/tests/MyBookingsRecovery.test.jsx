// Checks the client's failure/retry journey without a live API or real credentials.
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiClient from '../api/client';
import MyBookingsPage from '../pages/MyBookingsPage';

test('a failed history request does not pretend the client has no bookings', async () => {
  vi.spyOn(apiClient, 'get').mockRejectedValue({ response: { data: { message: 'History unavailable.' } } });
  render(<MyBookingsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable.');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  expect(screen.queryByText('You have not booked any gigs yet.')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('retry reloads the client endpoint and clears the failure after success', async () => {
  const get = vi.spyOn(apiClient, 'get')
    .mockRejectedValueOnce({ response: { data: { message: 'History unavailable.' } } })
    .mockResolvedValueOnce({ data: { data: { bookings: [{
      id: 'retry-booking', gigTitle: 'Recovered booking', priceAtBooking: 75,
      status: 'confirmed', createdAt: '2026-11-05T10:00:00Z',
    }] } } });
  render(<MyBookingsPage />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Recovered booking')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  expect(get.mock.calls.map(([url]) => url)).toEqual(['/bookings/mine', '/bookings/mine']);
});
