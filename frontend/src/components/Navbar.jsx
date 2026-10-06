import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">HustleHub+</Link>
      <div className="nav-links">
        <Link to="/">Browse Gigs</Link>
        {isAuthenticated && user.role === 'freelancer' && (
          <>
            <Link to="/my-gigs">My Gigs</Link>
            <Link to="/received-bookings">Received Bookings</Link>
            <Link to="/dashboard">Dashboard</Link>
          </>
        )}
        {isAuthenticated && user.role === 'client' && <Link to="/my-bookings">My Bookings</Link>}
        {isAuthenticated ? (
          <>
            <span className="nav-user">{user.email} ({user.role})</span>
            <button type="button" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
