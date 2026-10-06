export default function GigCard({ gig, action }) {
  return (
    <div className="gig-card" data-testid="gig-card">
      <div className="gig-card-header">
        <h3>{gig.title}</h3>
        <span className="gig-price">R{Number(gig.price).toFixed(2)}</span>
      </div>
      <p className="gig-category">{gig.category}</p>
      <p className="gig-description">{gig.description}</p>
      {action}
    </div>
  );
}
