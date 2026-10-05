import { useEffect, useRef, useState } from 'react';
import { Notice } from './States.jsx';

export default function ConfirmDelete({ gig, onConfirm, onCancel }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  async function confirm() {
    setBusy(true);
    try { await onConfirm(); } catch (problem) { setError(problem.message); setBusy(false); }
  }
  return <dialog ref={dialog} className="modal" aria-labelledby="delete-title" onCancel={(event) => { if (busy) event.preventDefault(); else onCancel(); }}>
    <h2 id="delete-title">Remove this service?</h2><p>{gig.title} will no longer appear in the service list. Existing demo bookings stay in the booking list.</p>
    <Notice error>{error}</Notice><div className="actions"><button className="button secondary" disabled={busy} onClick={onCancel}>Keep service</button><button className="button danger" disabled={busy} onClick={confirm}>{busy ? 'Removing…' : 'Remove service'}</button></div>
  </dialog>;
}
