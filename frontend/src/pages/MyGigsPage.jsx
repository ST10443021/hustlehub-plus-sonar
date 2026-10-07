import { useCallback, useEffect, useState } from 'react';
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
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await apiClient.get('/gigs/mine'); setGigs(res.data.data.gigs); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const reset = () => { setForm(emptyForm); setEditingId(null); };
  const submit = async (event) => {
    event.preventDefault(); if (pending) return;
    setError(''); setSuccess('');
    const invalid = validateGig(form); if (invalid) { setError(invalid); return; }
    setPending(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editingId) await apiClient.put(`/gigs/${editingId}`, payload);
      else await apiClient.post('/gigs', payload);
      setSuccess(editingId ? 'Gig updated.' : 'Gig created.'); reset(); await load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setPending(false); }
  };
  const remove = async () => {
    if (pending || !deleteGig) return;
    setPending(true); setError(''); setSuccess('');
    try {
      await apiClient.delete(`/gigs/${deleteGig.id}`);
      if (editingId === deleteGig.id) reset();
      setDeleteGig(null); setSuccess('Gig deleted.'); await load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setPending(false); }
  };
  return <div className="page">
    <h1>My Gigs</h1><AlertMessage message={error} /><AlertMessage type="success" message={success} />
    {error && <button disabled={pending} onClick={() => { setError(''); load(); }}>Reload listings</button>}
    <form onSubmit={submit} className="gig-form" noValidate>
      <h2>{editingId ? 'Edit gig' : 'Create a new gig'}</h2>
      <fieldset disabled={pending || Boolean(deleteGig)}>
        <label htmlFor="title">Title</label><input id="title" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} maxLength={120} />
        <label htmlFor="category">Category</label><input id="category" name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required maxLength={60} />
        <label htmlFor="price">Price (ZAR)</label><input id="price" name="price" type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <label htmlFor="description">Description</label><textarea id="description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={10} maxLength={2000} rows={4} />
        <div className="form-actions"><button type="submit">{pending ? 'Saving...' : editingId ? 'Save changes' : 'Create gig'}</button>{editingId && <button type="button" onClick={reset}>Cancel</button>}</div>
      </fieldset>
    </form>
    {deleteGig && <section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="confirmation">
      <h2 id="delete-title">Delete gig?</h2><p>{deleteGig.title}</p><p>Old booking amounts will stay saved.</p>
      <button disabled={pending} onClick={remove}>{pending ? 'Deleting...' : 'Confirm delete'}</button>
      <button disabled={pending} onClick={() => setDeleteGig(null)}>Cancel</button>
    </section>}
    <h2>Your listings</h2>
    {loading ? <p role="status">Loading listings...</p> : !error && gigs.length === 0 ? <p>You have not created any gigs yet.</p> : null}
    <ul className="gig-list">{!loading && gigs.map((gig) => <li key={gig.id} data-testid="my-gig-item">
      <strong>{gig.title}</strong> - R{Number(gig.price).toFixed(2)} ({gig.isActive ? 'active' : 'inactive'})
      <div className="form-actions">
        <button disabled={pending || Boolean(deleteGig)} onClick={() => { setEditingId(gig.id); setForm({ title: gig.title, category: gig.category, description: gig.description, price: String(gig.price) }); }}>Edit</button>
        <button disabled={pending || Boolean(deleteGig)} onClick={() => { setError(''); setDeleteGig(gig); }}>Delete</button>
      </div>
    </li>)}</ul>
  </div>;
}
