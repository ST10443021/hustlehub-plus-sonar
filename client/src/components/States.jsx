export function Notice({ children, error = false }) {
  return children ? <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div> : null;
}

export function ResourceState({ resource, empty, children }) {
  if (resource.loading) return <div className="state-box" role="status">Loading…</div>;
  if (resource.error) return <div className="state-box"><Notice error>{resource.error}</Notice><button className="button secondary" onClick={resource.retry}>Try again</button></div>;
  if (empty) return <div className="state-box"><h2>Nothing here yet</h2><p>{empty}</p></div>;
  return children;
}

export function PageHeading({ eyebrow, title, children }) {
  return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{children}</p></header>;
}
