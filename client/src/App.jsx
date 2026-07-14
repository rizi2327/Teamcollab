// src/App.jsx — updated for Feature 4.1
// CHANGES:
//   - AppLayout now wraps children in <SocketProvider> internally
//   - Added /socket-test route (dev only — remove before shipping)

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute  from './components/PublicRoute';
import AppLayout    from './layouts/AppLayout';   // now includes SocketProvider

// Pages
import Login         from './pages/Login';
import Register      from './pages/Register';
import Profile       from './pages/Profile';
import Dashboard     from './pages/Dashboard';
import AcceptInvite  from './pages/AcceptInvite';
import WorkspaceView from './pages/WorkspaceView';
import AnalyticsDashboard from './pages/AnalyticsDashboard';   // ← NEW 6.1
import SocketTest    from './pages/SocketTest';   // ← NEW dev-only 4.1

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'DM Sans', system-ui", background: '#F6F5FF' }}>
      <h1 style={{ fontSize: 72, fontWeight: 800, color: '#6C63FF', margin: 0, letterSpacing: '-3px' }}>404</h1>
      <p style={{ color: '#999', margin: 0, fontSize: 15 }}>Page not found</p>
      <a href="/" style={{ color: '#6C63FF', fontWeight: 600, fontSize: 14, marginTop: 6 }}>← Go home</a>
    </div>
  );
}

// All protected pages that need the Sidebar + Socket connection
function ProtectedWithSidebar({ children }) {
  return (
    <PrivateRoute>
      <WorkspaceProvider>
        {/* AppLayout wraps in SocketProvider internally (Feature 4.1) */}
        <AppLayout>{children}</AppLayout>
      </WorkspaceProvider>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Invite landing */}
          <Route path="/invites/:token" element={<AcceptInvite />} />

          {/* Protected — with Sidebar + Socket */}
          <Route path="/dashboard"      element={<ProtectedWithSidebar><Dashboard /></ProtectedWithSidebar>} />
          <Route path="/workspaces/:id" element={<ProtectedWithSidebar><WorkspaceView /></ProtectedWithSidebar>} />
          <Route path="/workspaces/:id/analytics" element={<ProtectedWithSidebar><AnalyticsDashboard /></ProtectedWithSidebar>} />{/* ← NEW 6.1 */}

          {/* Dev-only socket test page (Feature 4.1) */}
          <Route path="/socket-test" element={
            <PrivateRoute><WorkspaceProvider><AppLayout><SocketTest /></AppLayout></WorkspaceProvider></PrivateRoute>
          } />

          {/* Protected — standalone */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}