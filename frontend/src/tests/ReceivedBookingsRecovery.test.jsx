// Failure/recovery checks for the freelancer's received bookings; API responses are mocked.
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiClient from '../api/client';
import ReceivedBookingsPage from '../pages/ReceivedBookingsPage';

test('a failed received-bookings request stays an error until a successful retry', async () => {
  const get = vi.spyOn(apiClient, 'get')
    .mockRejectedValueOnce({ response: { data: { message: 'Received bookings unavailable.' } } })
    .mockResolvedValueOnce({ data: { data: { bookings: [] } } });
  render(<ReceivedBookingsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Received bookings unavailable.');
  expect(screen.queryByText('No bookings received yet.')).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No bookings received yet.')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(get.mock.calls.map(([url]) => url)).toEqual(['/bookings/received', '/bookings/received']);
});

test('a hostile server error is shown as text rather than rendered as an element', async () => {
  const message = 'Unavailable <img src=x onerror=alert(1)>';
  vi.spyOn(apiClient, 'get').mockRejectedValue({ response: { data: { message } } });
  const { container } = render(<ReceivedBookingsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
});
