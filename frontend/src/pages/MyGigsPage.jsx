import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import AlertMessage from '../components/AlertMessage';
import { validateGig } from '../lib/validation';
const emptyForm = { title: '', description: '', category: '', price: '' };
export default function MyGigsPage() {
  const [gigs, setGigs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteGig, setDeleteGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const titleInput = useRef(null);
  const cancelDeleteButton = useRef(null);
  const deleteTrigger = useRef(null);
  const actionPending = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { const res = await apiClient.get('/gigs/mine'); setGigs(res.data.data.gigs); }
    catch (err) { setLoadError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (pending) return;
    if (deleteGig) cancelDeleteButton.current?.focus();
    else if (deleteTrigger.current) {
      // Wait for React to re-enable the trigger before restoring focus.
      if (deleteTrigger.current.isConnected) deleteTrigger.current.focus();
      else titleInput.current?.focus();
      deleteTrigger.current = null;
    }
  }, [deleteGig, pending]);
  const reset = () => { setForm(emptyForm); setEditingId(null); };
  const edit = (gig) => {
    setError(''); setSuccess('');
    setEditingId(gig.id);
    setForm({ title: gig.title, category: gig.category, description: gig.description, price: String(gig.price) });
    titleInput.current?.focus();
    titleInput.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };
  const cancelDelete = () => {
    if (actionPending.current) return;
    setDeleteGig(null); setError('');
  };
  const handleDeleteKeys = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); cancelDelete(); }
    if (event.key === 'Tab') {
      const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
      if (!buttons.length) { event.preventDefault(); return; }
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  const submit = async (event) => {
    event.preventDefault(); if (actionPending.current || deleteGig) return;
    setError(''); setSuccess('');
    const invalid = validateGig(form); if (invalid) { setError(invalid); return; }
    actionPending.current = true; setPending(true);
    try {
      const payload = { title: form.title.trim(), description: form.description.trim(), category: form.category.trim(), price: Number(form.price) };
      const res = editingId
        ? await apiClient.put(`/gigs/${editingId}`, payload)
        : await apiClient.post('/gigs', payload);
      const savedGig = res.data.data.gig;
      // Show the confirmed server result immediately; a failed list refresh
      // must not make a successful update look as though it failed.
      setGigs((current) => editingId
        ? current.map((gig) => gig.id === editingId ? savedGig : gig)
        : [savedGig, ...current]);
      setSuccess(editingId ? 'Gig updated.' : 'Gig created.'); reset();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { actionPending.current = false; setPending(false); }
  };
  const remove = async () => {
    if (actionPending.current || !deleteGig) return;
    actionPending.current = true; setPending(true); setError(''); setSuccess('');
    try {
      await apiClient.delete(`/gigs/${deleteGig.id}`);
      if (editingId === deleteGig.id) reset();
      setGigs((current) => current.filter((gig) => gig.id !== deleteGig.id));
      setDeleteGig(null); setSuccess('Gig deleted.');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { actionPending.current = false; setPending(false); }
  };
  return <div className="page">
    <h1>My Gigs</h1>
    <p>Create gigs below, or choose Edit or Delete on one of your listings.</p>
    {!deleteGig && <AlertMessage message={error} />}<AlertMessage type="success" message={success} />
    <AlertMessage message={loadError} />
    {loadError && <button disabled={pending || loading || Boolean(deleteGig)} onClick={load}>Reload listings</button>}
    <form onSubmit={submit} className="gig-form" noValidate>
      <h2>{editingId ? 'Edit gig' : 'Create a new gig'}</h2>
      <fieldset disabled={pending || loading || Boolean(deleteGig)}>
        <label htmlFor="title">Title</label><input ref={titleInput} id="title" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} maxLength={120} />
        <label htmlFor="category">Category</label><input id="category" name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required maxLength={60} />
        <label htmlFor="price">Price (ZAR)</label><input id="price" name="price" type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <label htmlFor="description">Description</label><textarea id="description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={10} maxLength={2000} rows={4} />
        <div className="form-actions"><button type="submit">{pending ? 'Saving...' : editingId ? 'Save changes' : 'Create gig'}</button>{editingId && <button type="button" onClick={reset}>Cancel</button>}</div>
      </fieldset>
    </form>
    {deleteGig && <section role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="confirmation" onKeyDown={handleDeleteKeys}>
      <h2 id="delete-title">Delete gig?</h2><p>{deleteGig.title}</p><p id="delete-description">This removes the gig from your listings and the marketplace. Existing bookings, transactions and income will stay saved.</p>
      <AlertMessage message={error} />
      <button disabled={pending} onClick={remove}>{pending ? 'Deleting...' : 'Confirm delete'}</button>
      <button ref={cancelDeleteButton} disabled={pending} onClick={cancelDelete}>Cancel</button>
    </section>}
    <h2>Your listings</h2>
    {loading ? <p role="status">Loading listings...</p> : !loadError && gigs.length === 0 ? <p>You have not created any gigs yet.</p> : null}
    <ul className="gig-list">{!loading && gigs.map((gig) => <li key={gig.id} data-testid="my-gig-item">
      <strong>{gig.title}</strong> - R{Number(gig.price).toFixed(2)} ({gig.isActive ? 'active' : 'inactive'})
      <p className="hint">{gig.category}</p><p>{gig.description}</p>
      <div className="form-actions">
        <button disabled={pending || Boolean(deleteGig)} onClick={() => edit(gig)}>Edit</button>
        <button disabled={pending || Boolean(deleteGig)} onClick={(event) => { deleteTrigger.current = event.currentTarget; setError(''); setSuccess(''); setDeleteGig(gig); }}>Delete</button>
      </div>
    </li>)}</ul>
  </div>;
}
