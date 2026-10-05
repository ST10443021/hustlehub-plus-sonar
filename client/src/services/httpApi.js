// DRAFT marketplace routes: see docs/part2/API_CONTRACT_DRAFT.md.
// Not connected to App yet. Blake/Hamza must supply the real authenticated session.
// No localStorage token handling, fake authentication, or mock fallback in this adapter.
export function createHttpApi({ baseUrl, getToken, fetchImpl = globalThis.fetch }) {
  if (!baseUrl || !getToken) throw new Error('API URL and token provider are required.');
  const base = baseUrl.replace(/\/$/, '');
  async function request(path, { method = 'GET', body, protectedRoute = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (protectedRoute) {
      const token = await getToken();
      if (!token) throw new Error('Please log in to continue.');
      headers.Authorization = `Bearer ${token}`;
    }
    let response;
    try {
      response = await fetchImpl(`${base}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    } catch {
      throw new Error('Could not reach the server. Please try again.');
    }
    let payload;
    try { payload = await response.json(); } catch { throw new Error('The server returned an unreadable response.'); }
    if (!response.ok) {
      // Fixed messages keep unexpected server internals out of the UI.
      const messages = { 400: 'Please check the details you entered.', 401: 'Please log in again.', 403: 'You do not have permission for this action.', 404: 'This item is no longer available.', 409: 'This action conflicts with an existing record.', 429: 'Too many requests. Please wait and try again.' };
      const error = new Error(messages[response.status] || 'Something went wrong. Please try again.');
      error.status = response.status;
      throw error;
    }
    if (payload.status !== 'success' || !payload.data) throw new Error('The server response did not match the agreed API format.');
    return payload.data;
  }
  return {
    listGigs: async () => (await request('/api/gigs', { protectedRoute: false })).gigs,
    getMyGigs: async () => (await request('/api/gigs/mine')).gigs,
    saveGig: async (_user, values, id) => (await request(id ? `/api/gigs/${encodeURIComponent(id)}` : '/api/gigs', { method: id ? 'PATCH' : 'POST', body: values })).gig,
    deleteGig: async (_user, id) => request(`/api/gigs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    bookGig: async (_user, gigId) => request('/api/bookings', { method: 'POST', body: { gigId } }),
    getMyBookings: async () => (await request('/api/bookings/mine')).bookings,
    getIncome: async () => request('/api/income/mine'),
  };
}
