import { money } from '../lib/format.js';

export default function GigCard({ gig, children }) {
  const category = gig.category || 'Services';
  return <article className="gig-card">
    <div className={`card-accent accent-${category.toLowerCase()}`}><span>{category}</span><span aria-hidden="true">↗</span></div>
    <div className="card-body"><p className="byline">By {gig.freelancerName}</p><h2>{gig.title}</h2><p className="description">{gig.description}</p>
      <div className="card-footer"><strong>{money(gig.priceCents)}</strong>{children}</div>
    </div>
  </article>;
}
