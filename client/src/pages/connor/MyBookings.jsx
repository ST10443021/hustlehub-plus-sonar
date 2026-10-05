import { PageHeading, ResourceState } from '../../components/States.jsx';
import BookingList from '../../components/BookingList.jsx';
import { useResource } from '../../hooks/useResource.js';

export default function MyBookings({ api, user, revision }) {
  const resource = useResource(() => api.getMyBookings(user), [api, user.id, revision]);
  return <><PageHeading eyebrow="YOUR CLIENT SPACE" title="My bookings">Keep the services you have booked in one place.</PageHeading>
    <ResourceState resource={resource} empty={resource.data?.length === 0 ? 'Book a service to get started.' : ''}><BookingList bookings={resource.data || []} /></ResourceState>
  </>;
}
