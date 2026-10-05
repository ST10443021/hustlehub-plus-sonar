import { PageHeading, ResourceState } from '../../components/States.jsx';
import BookingList from '../../components/BookingList.jsx';
import { useResource } from '../../hooks/useResource.js';

export default function ReceivedBookings({ api, user, revision }) {
  const resource = useResource(() => api.getMyBookings(user), [api, user.id, revision]);
  return <><PageHeading eyebrow="YOUR FREELANCER SPACE" title="Received bookings">See who has booked your services and the recorded fee.</PageHeading>
    <ResourceState resource={resource} empty={resource.data?.length === 0 ? 'Bookings for your services will appear here.' : ''}><BookingList bookings={resource.data || []} freelancer /></ResourceState>
  </>;
}
