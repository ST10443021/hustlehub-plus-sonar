import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowseGigsPage from './pages/BrowseGigsPage';
import MyGigsPage from './pages/MyGigsPage';
import DashboardPage from './pages/DashboardPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ReceivedBookingsPage from './pages/ReceivedBookingsPage';
import NotFoundPage from './pages/NotFoundPage';
import './index.css';

// Top-level route table. Route-level access control here is a UX
// convenience layered on top of the server-side RBAC enforced by the
// backend (requireAuth / requireRole) - see ProtectedRoute.jsx for the
// rationale (OWASP, 2021).
function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<BrowseGigsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/my-gigs"
            element={
              <ProtectedRoute role="freelancer">
                <MyGigsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="freelancer">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute role="client">
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/received-bookings" element={<ProtectedRoute role="freelancer"><ReceivedBookingsPage /></ProtectedRoute>} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
