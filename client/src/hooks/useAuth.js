// src/hooks/useAuth.js
// Central auth state — token storage, login, logout
// Used by Login page, protected routes, and the app header

import { useState, useCallback } from 'react';
import axios from 'axios';

const TOKEN_KEY = 'tc_token';   // tc = TeamCollab
const USER_KEY  = 'tc_user';

// ─── Token helpers ───────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser  = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};
export const isLoggedIn = () => !!getToken();

// ─── Axios default header (call once on app boot) ────────────────────────────
export const setAxiosToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Boot: apply stored token immediately when module loads
setAxiosToken(getToken());

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser]   = useState(getUser);
  const [token, setToken] = useState(getToken);

  const saveAuth = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setAxiosToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAxiosToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, saveAuth, clearAuth, isLoggedIn: !!token };
}