// Administrator console: platform totals, accounts and recent security events.
// It is read-only. The server enforces the admin role on every /api/admin request; hiding this page
// from other roles is only a convenience (OWASP, 2021). Values render as React text, never as HTML,
// so a hostile email address or log value cannot run script (OWASP, 2021).
import { useCallback, useEffect, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import AlertMessage from '../components/AlertMessage';
import { rand } from '../lib/format';

function describeEvent(e) {
  const parts = [e.reason, e.method && e.path ? `${e.method} ${e.path}` : e.path, e.role && `role ${e.role}`, e.limiter && `limiter ${e.limiter}`, e.ip].filter(Boolean);
  return parts.join(' | ');
}

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [o, u, e] = await Promise.all([
        apiClient.get('/admin/overview'),
        apiClient.get('/admin/users', { params: { limit: 50 } }),
        apiClient.get('/admin/security-events', { params: { limit: 50 } }),
      ]);
      setOverview(o.data.data); setUsers(u.data.data.users); setEvents(e.data.data.events);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return <div className="page"><h1>Admin Console</h1>
    <AlertMessage message={error} />
    {error && <button onClick={load}>Try again</button>}
    {loading && <p role="status">Loading platform data...</p>}
    {!loading && overview && <>
      <div className="dashboard-cards">
        <div className="card" aria-label="Users"><h3>Users</h3><p className="stat">{overview.users.total}</p><p className="hint">{overview.users.client} clients, {overview.users.freelancer} freelancers, {overview.users.admin} admin</p></div>
        <div className="card" aria-label="Gigs"><h3>Gigs</h3><p className="stat">{overview.gigs.total}</p><p className="hint">{overview.gigs.active} active</p></div>
        <div className="card" aria-label="Bookings"><h3>Bookings</h3><p className="stat">{overview.bookings}</p></div>
        <div className="card" aria-label="Transactions"><h3>Transactions</h3><p className="stat">{overview.transactions.count}</p><p className="hint">Simulated value {rand(overview.transactions.value)}</p></div>
      </div>

      <section className="card" aria-label="Accounts">
        <h3>Accounts</h3>
        <div className="table-scroll"><table>
          <thead><tr><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.role}</td><td>{u.locked ? <span className="badge badge-warn">Locked</span> : 'Active'}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="card" aria-label="Security events">
        <h3>Recent security events</h3>
        {events.length === 0 ? <p className="hint">No authentication or security events recorded yet.</p> :
          <div className="table-scroll"><table>
            <thead><tr><th scope="col">Time</th><th scope="col">Level</th><th scope="col">Event</th><th scope="col">Details</th></tr></thead>
            <tbody>{events.map((e, i) => <tr key={`${e.timestamp}-${i}`}>
              <td>{new Date(e.timestamp).toLocaleString('en-ZA')}</td>
              <td><span className={`badge badge-${e.level}`}>{e.level}</span></td>
              <td>{e.event}</td><td className="hint">{describeEvent(e)}</td></tr>)}</tbody>
          </table></div>}
      </section>
    </>}
  </div>;
}
