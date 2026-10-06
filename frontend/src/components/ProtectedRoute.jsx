import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Client-side route guard. This is a UX convenience only - it stops an
 * unauthorised user from ever seeing a screen that would just error out,
 * but it is never the actual security boundary. Every real access-control
 * decision is enforced server-side by requireAuth/requireRole and the
 * gig-ownership checks in gigService.js, since any client-side check can
 * trivially be bypassed by a motivated user (OWASP, 2021).
 */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, user, initialising, sessionError, refreshSession } = useAuth();

  if (initialising) return <p role="status">Checking your session...</p>;
  if (sessionError) return <div role="alert">{sessionError} <button onClick={refreshSession}>Try again</button></div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
