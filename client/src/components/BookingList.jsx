import { dateLabel, money } from '../lib/format.js';

export default function BookingList({ bookings, freelancer = false }) {
  return <div className="booking-list">{bookings.map((booking) => <article className="booking-row" key={booking.id}>
    <div><p className="eyebrow">{dateLabel(booking.createdAt)}</p><h2>{booking.gigTitle}</h2><p>{freelancer ? `Client: ${booking.clientName}` : `Freelancer: ${booking.freelancerName}`}</p></div>
    <div className="booking-meta"><strong>{money(booking.amountCents, booking.currency)}</strong><span className="status-badge">{booking.status}</span><small>Simulated payment</small></div>
  </article>)}</div>;
}
