// Client booking-history coverage prepared for Connor to review and verify.
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import apiClient from '../api/client';
import MyBookingsPage from '../pages/MyBookingsPage';

const response = (bookings) => ({ data: { data: { bookings } } });

test('client history shows loading until the request completes', () => {
  vi.spyOn(apiClient, 'get').mockReturnValue(new Promise(() => {}));
  render(<MyBookingsPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading bookings');
  expect(screen.queryByText('You have not booked any gigs yet.')).not.toBeInTheDocument();
});

test('a successful empty client history uses the client message and endpoint', async () => {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue(response([]));
  render(<MyBookingsPage />);
  expect(await screen.findByText('You have not booked any gigs yet.')).toBeInTheDocument();
  expect(get).toHaveBeenCalledWith('/bookings/mine');
  expect(screen.queryByText('No bookings received yet.')).not.toBeInTheDocument();
});

test('history displays the booked snapshot and treats hostile titles as text', async () => {
  const title = 'Booked logo <img src=x onerror=alert(1)>';
  vi.spyOn(apiClient, 'get').mockResolvedValue(response([{
    id: 'client-booking-1', gigTitle: title, priceAtBooking: 125.50,
    price: 999, status: 'confirmed', clientId: 'client-id',
    createdAt: '2026-11-05T10:00:00Z',
  }]));
  const { container } = render(<MyBookingsPage />);
  expect(await screen.findByText(title)).toBeInTheDocument();
  const row = screen.getByRole('listitem');
  expect(row).toHaveTextContent('R125.50');
  expect(row).toHaveTextContent('confirmed');
  expect(row).toHaveTextContent('Booking: client-booking-1');
  expect(row).not.toHaveTextContent('R999.00');
  expect(row).not.toHaveTextContent('Client:');
  expect(container.querySelector('img')).toBeNull();
});
