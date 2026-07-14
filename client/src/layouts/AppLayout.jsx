// src/layouts/AppLayout.jsx — updated for Feature 5.1
// CHANGE: NotificationBell added next to ConnectionStatus in the fixed top-right corner

import Sidebar            from '../components/Sidebar';
import ConnectionStatus   from '../components/ConnectionStatus';
import NotificationBell   from '../components/NotificationBell';   // ← NEW 5.1
import { SocketProvider } from '../context/SocketContext';

export default function AppLayout({ children }) {
  return (
    <SocketProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F6F5FF' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Fixed top-right cluster: connection status + notification bell */}
          <div style={{
            position: 'fixed', top: 12, right: 16, zIndex: 200,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <ConnectionStatus />
            <NotificationBell />
          </div>

          {children}
        </div>
      </div>
    </SocketProvider>
  );
}