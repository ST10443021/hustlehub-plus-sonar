import { useCallback, useEffect, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import AlertMessage from './AlertMessage';
export default function BookingsPage({ received = false }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await apiClient.get(received ? '/bookings/received' : '/bookings/mine'); setBookings(res.data.data.bookings); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [received]);
  useEffect(() => { load(); }, [load]);
  return <div className="page">
    <h1>{received ? 'Received Bookings' : 'My Bookings'}</h1>
    <AlertMessage message={error} />
    {error && <button onClick={load}>Try again</button>}
    {loading ? <p role="status">Loading bookings...</p> : !error && bookings.length === 0 ? <p>{received ? 'No bookings received yet.' : 'You have not booked any gigs yet.'}</p> : null}
    <ul className="gig-list">{!loading && bookings.map((b) => <li key={b.id}>
      <strong>{b.gigTitle || 'Service booking'}</strong> - R{Number(b.priceAtBooking).toFixed(2)} - {b.status}
      <p className="hint">{new Date(b.createdAt).toLocaleString('en-ZA')}</p>
      <p className="hint">Booking: {b.id}</p>
      {received && <p className="hint">Client: {String(b.clientId)}</p>}
    </li>)}</ul>
  </div>;
}
