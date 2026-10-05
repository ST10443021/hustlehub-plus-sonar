// Blake/Hamza: replace the sample income response with trusted backend records.
import { PageHeading, ResourceState } from '../../components/States.jsx';
import { useResource } from '../../hooks/useResource.js';
import { money, dateLabel } from '../../lib/format.js';

export default function IncomePreview({ api, user, revision }) {
  const resource = useResource(() => api.getIncome(user), [api, user.id, revision]);
  return <><PageHeading eyebrow="YOUR FREELANCER SPACE" title="Income overview">A starter layout for income recorded from bookings.</PageHeading>
    <ResourceState resource={resource}>
      {resource.data && <><div className="income-card"><p>Recorded demo income</p><strong>{money(resource.data.amountCents, resource.data.currency)}</strong><span>{resource.data.transactions.length} simulated transactions</span></div>
        <div className="booking-list">{resource.data.transactions.map((transaction) => <article className="booking-row" key={transaction.id}><div><p className="eyebrow">{dateLabel(transaction.createdAt)}</p><h2>Booking transaction</h2><p>Simulated payment record</p></div><strong>{money(transaction.amountCents, transaction.currency)}</strong></article>)}</div>
      </>}
    </ResourceState>
  </>;
}
