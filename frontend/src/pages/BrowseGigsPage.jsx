import { useCallback, useEffect, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import GigCard from '../components/GigCard';
import AlertMessage from '../components/AlertMessage';
export default function BrowseGigsPage() {
  const { user, isAuthenticated, initialising } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await apiClient.get('/gigs'); setGigs(res.data.data.gigs); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const book = async () => {
    if (saving || !selected) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await apiClient.post('/bookings', { gigId: selected.id });
      setMessage(`Booking confirmed. A simulated payment of R${Number(res.data.data.transaction.amount).toFixed(2)} was recorded.`);
      setSelected(null);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };
  return <div className="page">
    <h1>Browse Gigs</h1>
    <AlertMessage message={error} /><AlertMessage type="success" message={message} />
    {error && !selected && <button onClick={load}>Try again</button>}
    {loading ? <p role="status">Loading gigs...</p> : !error && gigs.length === 0 ? <p>No gigs available yet.</p> : null}
    {selected && <section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="confirmation">
      <h2 id="booking-title">Confirm booking</h2><p>{selected.title} - R{Number(selected.price).toFixed(2)}</p>
      <p>Payment is simulated. The server confirms the current price.</p>
      <button onClick={book} disabled={saving}>{saving ? 'Booking...' : 'Confirm booking'}</button>
      <button onClick={() => setSelected(null)} disabled={saving}>Cancel</button>
    </section>}
    <div className="gig-grid">{!loading && gigs.map((gig) => <GigCard key={gig.id} gig={gig} action={
      !initialising && isAuthenticated && user.role === 'client' ? <button disabled={saving || Boolean(selected)} onClick={() => { setError(''); setMessage(''); setSelected(gig); }}>Book this gig</button> :
      !initialising && !isAuthenticated ? <p className="hint">Log in as a client to book this gig.</p> : null
    } />)}</div>
  </div>;
}
