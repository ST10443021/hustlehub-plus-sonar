import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
function Status() { const { user, initialising } = useAuth(); return <p>{initialising ? 'Checking' : user ? user.email : 'Logged out'}</p>; }
test('reload uses a verified profile instead of trusting a saved role', async () => {
  localStorage.setItem('hustlehub_token', 'stored-token');
  localStorage.setItem('hustlehub_user', JSON.stringify({ role: 'admin' }));
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { user: { role: 'client', email: 'verified@example.com' }, expiresAt: Date.now() + 60000 } } });
  render(<AuthProvider><Status /></AuthProvider>);
  expect(await screen.findByText('verified@example.com')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('hustlehub_user')).role).toBe('client');
});
test('expired saved session clears the token and user', async () => {
  localStorage.setItem('hustlehub_token', 'expired-token');
  localStorage.setItem('hustlehub_user', JSON.stringify({ role: 'client' }));
  vi.spyOn(apiClient, 'get').mockRejectedValue({ response: { status: 401 } });
  render(<AuthProvider><Status /></AuthProvider>);
  expect(await screen.findByText('Logged out')).toBeInTheDocument();
  expect(localStorage.getItem('hustlehub_token')).toBeNull();
});
test('a backend-verified expiry also logs out without a new request', async () => {
  localStorage.setItem('hustlehub_token', 'stored-token');
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { user: { role: 'client', email: 'client@example.com' }, expiresAt: Date.now() - 1 } } });
  render(<AuthProvider><Status /></AuthProvider>);
  await waitFor(() => expect(localStorage.getItem('hustlehub_token')).toBeNull());
});
