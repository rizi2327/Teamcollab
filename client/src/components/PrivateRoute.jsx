// src/components/PrivateRoute.jsx
// Wraps any route that requires authentication.
// Shows a loading spinner while verifying the stored token,
// then redirects to /login if not authenticated.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

// ── Fullscreen loader shown during token verification ────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: '#F6F5FF',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Animated logo */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: '#F0EEFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'tc-pulse 1.5s ease-in-out infinite',
      }}>
        <style>{`
          @keyframes tc-pulse {
            0%, 100% { transform: scale(1);   opacity: 1; }
            50%       { transform: scale(0.9); opacity: 0.6; }
          }
          @keyframes tc-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="#6C63FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Spinner */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        style={{ animation: 'tc-spin 0.8s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="#E0DFF5" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#6C63FF" strokeWidth="3" strokeLinecap="round" />
      </svg>

      <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
        Verifying session…
      </p>
    </div>
  );
}

// ── PrivateRoute ─────────────────────────────────────────────────────────────
export default function PrivateRoute({ children }) {
  const { isLoggedIn, loading } = useAuthContext();
  const location = useLocation();

  // Still checking localStorage / calling /api/users/me
  if (loading) return <PageLoader />;

  // Not authenticated → redirect to login, remembering where they came from
  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}   // Login page can redirect back after login
        replace
      />
    );
  }

  // Authenticated → render the protected page
  return children;
}