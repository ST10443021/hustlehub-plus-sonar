// Freelancer booking-history coverage prepared for Muzzi to review and verify.
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import apiClient from '../api/client';
import ReceivedBookingsPage from '../pages/ReceivedBookingsPage';

test('an empty freelancer history uses the received-bookings route and message', async () => {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { bookings: [] } } });
  render(<ReceivedBookingsPage />);
  expect(await screen.findByText('No bookings received yet.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Received Bookings' })).toBeInTheDocument();
  expect(get).toHaveBeenCalledWith('/bookings/received');
  expect(screen.queryByText('You have not booked any gigs yet.')).not.toBeInTheDocument();
});

test('a freelancer sees the booked amount, booking identifier and client identifier', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { bookings: [{
    id: 'received-1', gigTitle: 'Original booked title', priceAtBooking: 240,
    price: 900, status: 'confirmed', clientId: 'client-42',
    createdAt: '2026-11-05T10:00:00Z',
  }] } } });
  render(<ReceivedBookingsPage />);
  expect(await screen.findByText('Original booked title')).toBeInTheDocument();
  const row = screen.getByRole('listitem');
  expect(row).toHaveTextContent('R240.00');
  expect(row).toHaveTextContent('Booking: received-1');
  expect(row).toHaveTextContent('Client: client-42');
  expect(row).not.toHaveTextContent('R900.00');
});
