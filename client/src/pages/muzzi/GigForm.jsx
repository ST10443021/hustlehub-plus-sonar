import { useState } from 'react';
import { validateGig } from '../../lib/format.js';
import { Notice } from '../../components/States.jsx';

export default function GigForm({ initial, onSave, onCancel }) {
  const [values, setValues] = useState({ title: initial?.title || '', description: initial?.description || '', price: initial ? (initial.priceCents / 100).toFixed(2) : '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (event) => setValues((old) => ({ ...old, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const checked = validateGig(values);
    setErrors(checked.errors); setError('');
    if (Object.keys(checked.errors).length) return;
    setBusy(true);
    try { await onSave(checked.data); } catch (problem) { setError(problem.message); setBusy(false); }
  }
  return <section className="form-panel" aria-labelledby="gig-form-title"><p className="eyebrow">YOUR NEXT OFFER</p><h2 id="gig-form-title">{initial ? 'Edit service' : 'Add a service'}</h2>
    <form onSubmit={submit} noValidate><fieldset disabled={busy}>
      <label htmlFor="gig-title">Service title</label><input id="gig-title" name="title" value={values.title} onChange={update} maxLength={80} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} />
      {errors.title && <p className="field-error" id="title-error" role="alert">{errors.title}</p>}
      <label htmlFor="gig-description">Description</label><textarea id="gig-description" name="description" value={values.description} onChange={update} rows={4} maxLength={500} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} />
      {errors.description && <p className="field-error" id="description-error" role="alert">{errors.description}</p>}
      <label htmlFor="gig-price">Price (ZAR)</label><input id="gig-price" name="price" inputMode="decimal" value={values.price} onChange={update} placeholder="e.g. 500.00" aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'price-error' : undefined} />
      {errors.price && <p className="field-error" id="price-error" role="alert">{errors.price}</p>}
      <Notice error>{error}</Notice><div className="actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button" type="submit">{busy ? 'Saving…' : 'Save service'}</button></div>
    </fieldset></form>
  </section>;
}
