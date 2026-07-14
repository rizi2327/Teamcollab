// src/components/PublicRoute.jsx
// Redirects already-logged-in users away from /login and /register.
// e.g. if you're logged in and go to /login, you land on /dashboard instead.

import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function PublicRoute({ children }) {
  const { isLoggedIn, loading } = useAuthContext();

  // Wait for auth check before deciding
  if (loading) return null;

  // Already logged in → send to dashboard
  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  // Not logged in → render the public page (login / register)
  return children;
}