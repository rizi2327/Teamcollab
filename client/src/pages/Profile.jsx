// src/pages/Profile.jsx
// Feature 1.4 — User Profile Page
// Sections: Profile info edit | Change password | Danger zone (delete account)
// Uses useAuthContext() for user state and logout

import { useState } from 'react';
import axios from 'axios';
import { useAuthContext } from '../context/AuthContext';
import '../styles/Profile.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name = '') {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return (
    <div className={`profile-toast ${isSuccess ? 'profile-toast--success' : 'profile-toast--error'}`}>
      <span>{isSuccess ? '✓' : '✕'}</span>
      <span className="profile-toast-msg">{msg}</span>
      <button onClick={onClose} className="profile-toast-close">✕</button>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ title, subtitle, children }) {
  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2 className="profile-card-title">{title}</h2>
        {subtitle && <p className="profile-card-subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
function Field({ label, id, type = 'text', value, onChange, error, placeholder, disabled, hint }) {
  return (
    <div className="profile-field">
      <label htmlFor={id} className="profile-label">{label}</label>
      <input
        id={id} type={type} value={value} placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`profile-input ${error ? 'profile-input--error' : ''}`}
      />
      {error && <span className="profile-field-error">{error}</span>}
      {hint && !error && <span className="profile-field-hint">{hint}</span>}
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────
function Btn({ onClick, loading, children, variant = 'primary', disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`profile-btn profile-btn--${variant}`}
    >
      {loading
        ? <><Spin /> Saving…</>
        : children}
    </button>
  );
}

function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="profile-spinner">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function Profile() {
  const { user, saveAuth, clearAuth } = useAuthContext();

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ msg: '', type: '' });
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  // ── Profile form ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);

  const validateProfile = () => {
    const errs = {};
    if (!profile.name.trim() || profile.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!profile.email || !/^\S+@\S+\.\S+$/.test(profile.email)) errs.email = 'Enter a valid email address';
    return errs;
  };

  const handleProfileSave = async () => {
    const errs = validateProfile();
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setProfileLoading(true);
    try {
      const { data } = await axios.patch(`${API_URL}/users/me`, profile);
      // Update context so the header/navbar reflects new name instantly
      saveAuth(localStorage.getItem('tc_token'), data.user);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Password form ─────────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false });

  const validatePw = () => {
    const errs = {};
    if (!pw.current) errs.current = 'Current password is required';
    if (!pw.newPw || pw.newPw.length < 6) errs.newPw = 'New password must be at least 6 characters';
    if (pw.newPw !== pw.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handlePwChange = async () => {
    const errs = validatePw();
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setPwLoading(true);
    try {
      await axios.patch(`${API_URL}/users/me/password`, {
        currentPassword: pw.current,
        newPassword: pw.newPw,
      });
      showToast('Password changed successfully');
      setPw({ current: '', newPw: '', confirm: '' });
      setPwErrors({});
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_URL}/users/me`);
      clearAuth();
      window.location.href = '/register';
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account', 'error');
      setDeleteLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="profile-page">
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />

      {/* ── Top bar ── */}
      <div className="profile-topbar">
        <div className="profile-topbar-left">
          <div className="profile-logo-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#6C63FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="profile-brand-name">TeamCollab</span>
        </div>
        <div className="profile-topbar-right">
          <a href="/dashboard" className="profile-nav-link">← Dashboard</a>
          <button onClick={handleLogout} className="profile-logout-btn">Logout</button>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="profile-body">

        {/* ── Left: Avatar column ── */}
        <div className="profile-sidebar">
          <div className="profile-avatar-wrap">
            <div
              className="profile-avatar"
              style={{ background: avatarColor(user?.name) }}
            >
              {getInitials(user?.name)}
            </div>
            <div className="profile-avatar-info">
              <p className="profile-avatar-name">{user?.name}</p>
              <p className="profile-avatar-email">{user?.email}</p>
            </div>
          </div>

          {/* Member since */}
          <div className="profile-meta-card">
            <div className="profile-meta-row">
              <span className="profile-meta-label">Member since</span>
              <span className="profile-meta-value">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
            <div className="profile-meta-row">
              <span className="profile-meta-label">Account ID</span>
              <span className="profile-meta-value profile-meta-value--mono">
                {user?._id?.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: Forms column ── */}
        <div className="profile-main">

          {/* Profile info */}
          <Card title="Profile Information" subtitle="Update your name and email address">
            <div className="profile-form-group">
              <Field
                label="Full name" id="name"
                value={profile.name}
                onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
                error={profileErrors.name}
                placeholder="Ali Khan"
              />
              <Field
                label="Email address" id="email" type="email"
                value={profile.email}
                onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                error={profileErrors.email}
                placeholder="ali@company.com"
              />
            </div>
            <div className="profile-card-actions">
              <Btn onClick={handleProfileSave} loading={profileLoading}>
                Save changes
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => setProfile({ name: user?.name || '', email: user?.email || '' })}
              >
                Reset
              </Btn>
            </div>
          </Card>

          {/* Change password */}
          <Card title="Change Password" subtitle="Use a strong password you don't use elsewhere">
            <div className="profile-form-group">
              <div className="profile-field-row">
                <Field
                  label="Current password" id="current"
                  type={showPw.current ? 'text' : 'password'}
                  value={pw.current}
                  onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                  error={pwErrors.current}
                  placeholder="Your current password"
                />
                <EyeToggle
                  show={showPw.current}
                  onToggle={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                />
              </div>
              <div className="profile-field-row">
                <Field
                  label="New password" id="newPw"
                  type={showPw.new ? 'text' : 'password'}
                  value={pw.newPw}
                  onChange={(v) => setPw((p) => ({ ...p, newPw: v }))}
                  error={pwErrors.newPw}
                  hint="At least 6 characters"
                  placeholder="New password"
                />
                <EyeToggle
                  show={showPw.new}
                  onToggle={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                />
              </div>
              <Field
                label="Confirm new password" id="confirm"
                type="password"
                value={pw.confirm}
                onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                error={pwErrors.confirm}
                placeholder="Re-enter new password"
              />
            </div>
            <div className="profile-card-actions">
              <Btn onClick={handlePwChange} loading={pwLoading}>
                Change password
              </Btn>
            </div>
          </Card>

          {/* Danger zone */}
          <Card title="Danger Zone" subtitle="Irreversible actions — proceed with caution">
            <div className="profile-danger-box">
              <div>
                <p className="profile-danger-title">
                  Delete account
                </p>
                <p className="profile-danger-desc">
                  Permanently delete your account and all your data. This cannot be undone.
                </p>
              </div>
              {!showDeleteConfirm ? (
                <Btn variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete account
                </Btn>
              ) : (
                <div className="profile-danger-confirm-row">
                  <Btn variant="danger" onClick={handleDelete} loading={deleteLoading}>
                    Yes, delete my account
                  </Btn>
                  <Btn variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Btn>
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

// ─── Eye toggle helper ────────────────────────────────────────────────────────
function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="profile-eye-toggle"
    >
      {show ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            stroke="#999" strokeWidth="2" strokeLinecap="round"/>
          <line x1="1" y1="1" x2="23" y2="23" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#999" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
        </svg>
      )}
    </button>
  );
}