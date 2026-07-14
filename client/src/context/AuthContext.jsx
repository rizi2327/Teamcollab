// src/context/AuthContext.jsx
// FIXED in Feature 1.4:
//   - Removed require() inside React component (was in App.jsx from 1.3 — bug)
//   - saveAuth now accepts optional token param (falls back to localStorage)
//   - clearAuth resets loading state properly

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'tc_token';
const USER_KEY  = 'tc_user';

// ── Storage helpers ───────────────────────────────────────────────────────────
const storedToken = () => localStorage.getItem(TOKEN_KEY);
const storedUser  = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};

// ── Axios token helper ────────────────────────────────────────────────────────
const applyAxiosToken = (token) => {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else        delete axios.defaults.headers.common['Authorization'];
};

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(storedUser);
  const [token,   setToken]   = useState(storedToken);
  const [loading, setLoading] = useState(true);

  // On mount: verify stored token is still valid against the server
  useEffect(() => {
    const verify = async () => {
      const t = storedToken();
      if (!t) { setLoading(false); return; }

      applyAxiosToken(t);
      try {
        const { data } = await axios.get(`${API_URL}/users/me`);
        setUser(data.user);
        setToken(t);
      } catch {
        // Expired or invalid — wipe everything silently
        _clear();
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  // Auto logout on any 401 TOKEN_EXPIRED across the whole app
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 &&
            err.response?.data?.code === 'TOKEN_EXPIRED') {
          _clear();
          window.location.href = '/login?reason=expired';
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // ── Internal clear (no setState race) ────────────────────────────────────
  const _clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    applyAxiosToken(null);
    setToken(null);
    setUser(null);
  };

  // ── saveAuth — called after login OR after profile update ────────────────
  // token param is optional: if omitted, reuses the one already in localStorage
  const saveAuth = useCallback((newToken, newUser) => {
    const t = newToken || storedToken();
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    applyAxiosToken(t);
    setToken(t);
    setUser(newUser);
  }, []);

  // ── clearAuth — called on logout ─────────────────────────────────────────
  const clearAuth = useCallback(() => {
    _clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, saveAuth, clearAuth, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}