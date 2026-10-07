import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '../api/client';
import MyGigsPage from '../pages/MyGigsPage';
import ReceivedBookingsPage from '../pages/ReceivedBookingsPage';
import BrowseGigsPage from '../pages/BrowseGigsPage';
import RegisterPage from '../pages/RegisterPage';
import { AuthProvider } from '../context/AuthContext';
const gig = { id: 'gig-1', title: 'Logo Design', description: 'Design a useful business logo', category: 'design', price: 100, isActive: true };
const response = (data) => ({ data: { data } });

async function fillGig(user, price = '') {
  await user.type(screen.getByLabelText('Title'), gig.title);
  await user.type(screen.getByLabelText('Category'), gig.category);
  await user.type(screen.getByLabelText('Description'), gig.description);
  if (price) await user.type(screen.getByLabelText('Price (ZAR)'), price);
}
describe('Marketplace interactions', () => {
  test('does not turn a blank price into a free gig', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(response({ gigs: [] }));
    const post = vi.spyOn(apiClient, 'post');
    render(<MyGigsPage />); const user = userEvent.setup();
    await fillGig(user); await user.click(screen.getByRole('button', { name: 'Create gig' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a price'); expect(post).not.toHaveBeenCalled();
  });
  test('keeps entered values and shows a field error after a failed save', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(response({ gigs: [] }));
    vi.spyOn(apiClient, 'post').mockRejectedValue({ response: { data: { message: 'Validation failed.', errors: [{ message: 'Title is invalid.' }] } } });
    render(<MyGigsPage />); const user = userEvent.setup();
    await fillGig(user, '100'); await user.click(screen.getByRole('button', { name: 'Create gig' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Title is invalid.');
    expect(screen.getByLabelText('Title')).toHaveValue(gig.title);
  });
  test('requires confirmation before deleting a gig', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(response({ gigs: [gig] }));
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue(response({}));
    render(<MyGigsPage />); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('/gigs/gig-1'));
  });
  test('loads and shows received bookings from the real route contract', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(response({ bookings: [{ id: 'booking-1', gigTitle: 'Logo Design', priceAtBooking: 100, status: 'confirmed', clientId: 'client-1', createdAt: '2026-10-05T10:00:00Z' }] }));
    render(<ReceivedBookingsPage />);
    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/bookings/received');
  });
  test('shows a loading state instead of an empty list while fetching', () => {
    vi.spyOn(apiClient, 'get').mockReturnValue(new Promise(() => {}));
    render(<ReceivedBookingsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading bookings');
    expect(screen.queryByText('No bookings received yet.')).not.toBeInTheDocument();
  });
  test('confirms a booking and sends only the gig ID', async () => {
    localStorage.setItem('hustlehub_token', 'test-token');
    vi.spyOn(apiClient, 'get').mockImplementation((url) => Promise.resolve(response(url === '/auth/profile' ? { user: { id: 'client-1', role: 'client', email: 'client@example.com' } } : { gigs: [gig] })));
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(response({ transaction: { amount: 100 } }));
    render(<AuthProvider><BrowseGigsPage /></AuthProvider>); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Book this gig' }));
    expect(post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));
    expect(await screen.findByText(/Booking confirmed/)).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/bookings', { gigId: 'gig-1' });
  });
  test('validates signup before calling the API', async () => {
    const post = vi.spyOn(apiClient, 'post');
    render(<MemoryRouter><AuthProvider><RegisterPage /></AuthProvider></MemoryRouter>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    expect(post).not.toHaveBeenCalled();
  });
});
