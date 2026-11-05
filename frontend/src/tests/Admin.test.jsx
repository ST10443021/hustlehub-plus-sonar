// Tests for the admin console, the admin route guard and server-side sign-out
// (OWASP, 2021; Testing Library, n.d.). The API client is mocked, so no server is needed.
import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '../api/client';
import App from '../App';

const overview = { users: { client: 3, freelancer: 2, admin: 1, total: 6 }, gigs: { total: 4, active: 3 }, bookings: 5, transactions: { count: 5, value: 7250.5 } };
const users = [
  { id: 'u1', email: 'alice@example.com', role: 'client', locked: false },
  { id: 'u2', email: 'locked@example.com', role: 'freelancer', locked: true },
];
const events = [
  { timestamp: '2026-10-29T10:00:00Z', level: 'warn', category: 'security', event: 'account_locked', ip: '10.0.0.9' },
  { timestamp: '2026-10-29T09:59:00Z', level: 'warn', category: 'auth', event: 'login_failed', reason: 'bad_password', ip: '10.0.0.9' },
];

function mockApi(role) {
  localStorage.setItem('hustlehub_token', 'valid-token');
  vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
    if (url === '/auth/profile') return { data: { data: { user: { id: 'me', email: `${role}@example.com`, role }, expiresAt: Date.now() + 600000 } } };
    if (url === '/admin/overview') return { data: { data: overview } };
    if (url === '/admin/users') return { data: { data: { users } } };
    if (url === '/admin/security-events') return { data: { data: { events } } };
    if (url === '/gigs') return { data: { data: { gigs: [] } } };
    return { data: { data: {} } };
  });
}
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('Admin console', () => {
  test('an admin sees totals, accounts (with locked ones flagged) and security events', async () => {
    mockApi('admin');
    open('/admin');
    expect(await screen.findByRole('heading', { name: 'Admin Console' })).toBeInTheDocument();
    const usersCard = await screen.findByLabelText('Users');
    expect(within(usersCard).getByText('6')).toBeInTheDocument();
    expect(within(usersCard).getByText(/3 clients, 2 freelancers, 1 admin/)).toBeInTheDocument();
    expect(screen.getByText('Simulated value R7250.50')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    const eventsCard = screen.getByLabelText('Security events');
    expect(within(eventsCard).getByText('account_locked')).toBeInTheDocument();
    expect(within(eventsCard).getByText('bad_password | 10.0.0.9')).toBeInTheDocument();
  });

  test('the admin link appears in the navigation for admins only', async () => {
    mockApi('admin');
    open('/admin');
    expect(await screen.findByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  test.each(['client', 'freelancer'])('a %s who opens /admin is sent away and never sees admin data', async (role) => {
    mockApi(role);
    open('/admin');
    await screen.findByText(`${role}@example.com (${role})`);
    expect(screen.queryByRole('heading', { name: 'Admin Console' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith('/admin/overview');
  });

  test('shows the server error and a retry button when the data cannot be loaded', async () => {
    mockApi('admin');
    apiClient.get.mockImplementation(async (url) => {
      if (url === '/auth/profile') return { data: { data: { user: { id: 'me', email: 'admin@example.com', role: 'admin' }, expiresAt: Date.now() + 600000 } } };
      throw { response: { data: { message: 'You do not have permission to perform this action.' } } };
    });
    open('/admin');
    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  test('hostile account emails are shown as text, not run as HTML', async () => {
    mockApi('admin');
    const original = apiClient.get.getMockImplementation();
    apiClient.get.mockImplementation(async (url) => (url === '/admin/users'
      ? { data: { data: { users: [{ id: 'x', email: '<img src=x onerror=alert(1)>@evil.test', role: 'client', locked: false }] } } }
      : original(url)));
    const { container } = open('/admin');
    expect(await screen.findByText('<img src=x onerror=alert(1)>@evil.test')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('Server-side sign-out', () => {
  test('logging out calls the API and then clears the local session', async () => {
    mockApi('client');
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    open('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/logout'));
    await waitFor(() => expect(localStorage.getItem('hustlehub_token')).toBeNull());
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  test('the local session is still cleared when the server cannot be reached', async () => {
    mockApi('client');
    vi.spyOn(apiClient, 'post').mockRejectedValue({ request: {} });
    open('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(localStorage.getItem('hustlehub_token')).toBeNull());
  });
});
