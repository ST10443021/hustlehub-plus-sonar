// Muzzi: own the freelancer service screens, form, and received bookings.
import { useState } from 'react';
import GigCard from '../../components/GigCard.jsx';
import ConfirmDelete from '../../components/ConfirmDelete.jsx';
import { PageHeading, Notice, ResourceState } from '../../components/States.jsx';
import { useResource } from '../../hooks/useResource.js';
import GigForm from './GigForm.jsx';

export default function MyServices({ api, user, revision, onChanged }) {
  const resource = useResource(() => api.getMyGigs(user), [api, user.id, revision]);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [message, setMessage] = useState('');
  async function save(values) {
    await api.saveGig(user, values, editing?.id);
    setEditing(null); setMessage('Your demo service has been saved.'); onChanged();
  }
  async function remove() {
    await api.deleteGig(user, removing.id);
    setRemoving(null); setMessage('Your demo service has been removed.'); onChanged();
  }
  return <><PageHeading eyebrow="YOUR FREELANCER SPACE" title="My services">Turn what you do well into something people can book.</PageHeading>
    <div className="toolbar"><button className="button" onClick={() => { setEditing({}); setMessage(''); }}>Add service</button><span className="muted">Only your own services appear here.</span></div>
    <Notice>{message}</Notice>
    {editing && <GigForm key={editing.id || 'new'} initial={editing.id ? editing : undefined} onSave={save} onCancel={() => setEditing(null)} />}
    <ResourceState resource={resource} empty={resource.data?.length === 0 ? 'Add your first service using the button above.' : ''}>
      <div className="gig-grid">{resource.data?.map((gig) => <GigCard key={gig.id} gig={gig}><div className="actions compact"><button className="button secondary" onClick={() => { setEditing(gig); setMessage(''); }}>Edit</button><button className="text-button" onClick={() => setRemoving(gig)}>Delete</button></div></GigCard>)}</div>
    </ResourceState>
    {removing && <ConfirmDelete gig={removing} onConfirm={remove} onCancel={() => setRemoving(null)} />}
  </>;
}
