import { useState } from 'react';
import { demoUsers } from './data/fixtures.js';
import { createMockApi } from './services/mockApi.js';
import BrowseServices from './pages/connor/BrowseServices.jsx';
import MyBookings from './pages/connor/MyBookings.jsx';
import MyServices from './pages/muzzi/MyServices.jsx';
import ReceivedBookings from './pages/muzzi/ReceivedBookings.jsx';
import IncomePreview from './pages/shared/IncomePreview.jsx';

// DEMO shell only. Role switching is not authentication or access control.
// Blake/Hamza own real signup/login, protected navigation, and API integration.
export default function App({ api: injectedApi } = {}) {
  const [mockApi] = useState(() => createMockApi());
  const api = injectedApi || mockApi;
  const [user, setUser] = useState(demoUsers[0]);
  const [view, setView] = useState('browse');
  const [revision, setRevision] = useState(0);
  const onChanged = () => setRevision((value) => value + 1);
  const views = user.role === 'client' ? [ ['browse', 'Browse services'], ['my-bookings', 'My bookings'] ] : [ ['my-services', 'My services'], ['received', 'Received bookings'], ['income', 'Income overview'] ];
  const shared = { api, user, revision, onChanged };
  const pages = {
    browse: <BrowseServices {...shared} />,
    'my-bookings': <MyBookings {...shared} />,
    'my-services': <MyServices {...shared} />,
    received: <ReceivedBookings {...shared} />,
    income: <IncomePreview {...shared} />,
  };
  function selectUser(event) {
    const next = demoUsers.find((item) => item.id === event.target.value);
    setUser(next); setView(next.role === 'client' ? 'browse' : 'my-services');
  }
  return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar"><div className="brand">hustlehub<span>+</span></div><p className="brand-caption">Small skills. Big possibilities.</p>
      <p className="nav-label">WORKSPACE</p><nav aria-label="Workspace">{views.map(([id, title]) => <button key={id} onClick={() => setView(id)} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined}>{title}<span aria-hidden="true">↗</span></button>)}</nav>
      <div className="sidebar-note"><p>Make room for good work.</p><span>A place for independent talent and new ideas.</span></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="demo-label"><span className="dot" />Sample data · Part 2 starter</div><div className="user-picker"><label htmlFor="demo-user">Demo user</label><select id="demo-user" value={user.id} onChange={selectUser}>{demoUsers.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}</select></div></header>
      <div className="demo-banner">Explore the starter with sample users. Changes reset when you reload; this is not connected to the backend.</div>
      <main id="main" key={`${user.id}-${view}`}>{pages[view]}</main><footer className="app-footer">HustleHub+ · Team starter for Part 2</footer>
    </div>
  </div>;
}
