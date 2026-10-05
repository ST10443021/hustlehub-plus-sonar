// Connor: own the browse layout, booking panel, and client booking pages.
import { useState } from 'react';
import GigCard from '../../components/GigCard.jsx';
import { Notice, PageHeading, ResourceState } from '../../components/States.jsx';
import { useResource } from '../../hooks/useResource.js';
import BookingPanel from './BookingPanel.jsx';

export default function BrowseServices({ api, user, revision, onChanged }) {
  const resource = useResource(() => api.listGigs(), [api, revision]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  return <>
    <PageHeading eyebrow="THE MARKETPLACE" title="Good work starts here.">Find a service, meet your next freelancer, and make it happen.</PageHeading>
    <Notice>{message}</Notice>
    <ResourceState resource={resource} empty={resource.data?.length === 0 ? 'New services will appear here when freelancers add them.' : ''}>
      <div className="gig-grid">{resource.data?.map((gig) => <GigCard key={gig.id} gig={gig}><button className="button" onClick={() => { setSelected(gig); setMessage(''); }}>View & book</button></GigCard>)}</div>
    </ResourceState>
    {selected && <BookingPanel key={selected.id} gig={selected} user={user} api={api} onCancel={() => setSelected(null)} onBooked={() => { setSelected(null); setMessage('Your demo booking is confirmed. Find it under My bookings.'); onChanged(); }} />}
  </>;
}
