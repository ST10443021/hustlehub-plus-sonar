import { useEffect, useRef, useState } from 'react';
import { money } from '../../lib/format.js';
import { Notice } from '../../components/States.jsx';

export default function BookingPanel({ gig, user, api, onCancel, onBooked }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  async function confirm() {
    setBusy(true); setError('');
    try { await api.bookGig(user, gig.id); onBooked(); }
    catch (problem) { setError(problem.message); setBusy(false); }
  }
  return <dialog ref={dialog} className="modal" aria-labelledby="booking-title" onCancel={(event) => { if (busy) event.preventDefault(); else onCancel(); }}>
    <p className="eyebrow">BOOK A SERVICE</p><h2 id="booking-title">{gig.title}</h2><p>{gig.description}</p>
    <div className="summary-line"><span>Freelancer</span><strong>{gig.freelancerName}</strong></div>
    <div className="summary-line"><span>Total</span><strong>{money(gig.priceCents)}</strong></div>
    <p className="muted">This starter uses sample data. No payment is taken.</p><Notice error>{error}</Notice>
    <div className="actions"><button className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="button" disabled={busy} onClick={confirm}>{busy ? 'Confirming…' : 'Confirm booking'}</button></div>
  </dialog>;
}
