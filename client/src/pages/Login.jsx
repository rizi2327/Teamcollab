// src/pages/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import '../styles/Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Small reusable field ────────────────────────────────────────────────────
function Field({ label, id, type = 'text', value, onChange, error, placeholder, rightSlot }) {
  return (
    <div className="login-field">
      <label htmlFor={id} className="login-label">{label}</label>
      <div className="login-input-wrap">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={id}
          className={`login-input ${error ? 'login-input--error' : ''} ${
            rightSlot ? 'login-input--with-right-slot' : ''
          }`}
        />
        {rightSlot && (
          <div className="login-input-right">{rightSlot}</div>
        )}
      </div>
      {error && <span className="login-field-error">{error}</span>}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="login-spinner">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div className="login-divider">
      <div className="login-divider-line" />
      <span className="login-divider-label">{label}</span>
      <div className="login-divider-line" />
    </div>
  );
}

// ─── Validate ────────────────────────────────────────────────────────────────
function validate({ email, password }) {
  const errs = {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    errs.email = 'Enter a valid email address';
  if (!password || password.length < 1)
    errs.password = 'Password is required';
  return errs;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Login() {
  const { saveAuth } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus]   = useState('idle');   // idle | loading | error | success
  const [serverMsg, setServerMsg] = useState('');
  const [remember, setRemember]   = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus('loading');
    setServerMsg('');

    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        email: form.email.trim(),
        password: form.password,
      });

      // Save token + user to localStorage via hook
      saveAuth(data.token, data.user);

      setStatus('success');
      setServerMsg(`Welcome back, ${data.user.name}!`);

      // ─── Redirect to dashboard after brief delay ──────────────────────
      setTimeout(() => {
        window.location.href = '/dashboard';
        // Or if using react-router: navigate('/dashboard')
      }, 900);

    } catch (err) {
      setStatus('error');
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        'Something went wrong. Please try again.';
      setServerMsg(msg);
    }
  };

  // ─── Enter key support ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <div className="login-page" onKeyDown={handleKeyDown}>
      {/* Background decoration */}
      <div className="login-bg-circle1" />
      <div className="login-bg-circle2" />
      <div className="login-bg-grid" />

      <div className="login-card">

        {/* ── Brand ── */}
        <div className="login-brand">
          <div className="login-logo-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#6C63FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="login-brand-name">TeamCollab</span>
        </div>

        {/* ── Heading ── */}
        <div>
          <h1 className="login-title">Welcome badck</h1>
          <p className="login-subtitle">Sign in to continue to your workspace</p>
        </div>

        {/* ── Success Banner ── */}
        {isSuccess && (
          <div className="login-banner login-banner-success">
            <span>✓</span>
            <span>{serverMsg}</span>
            <span className="login-redirect-note">Redirecting…</span>
          </div>
        )}

        {/* ── Error Banner ── */}
        {status === 'error' && (
          <div className="login-banner login-banner-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#A32D2D" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>{serverMsg}</span>
            <button className="login-dismiss-btn" onClick={() => setStatus('idle')}>✕</button>
          </div>
        )}

        {/* ── Form ── */}
        <div className="login-form">
          <Field
            label="Email address"
            id="email"
            type="email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            placeholder="ali@company.com"
          />

          <Field
            label="Password"
            id="password"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            placeholder="Enter your password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="login-show-hide-btn"
              >
                {showPass ? (
                  // Eye-off icon
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                      stroke="#999" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  // Eye icon
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke="#999" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            }
          />
        </div>

        {/* ── Remember + Forgot ── */}
        <div className="login-remember-row">
          <label className="login-remember-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="login-remember-checkbox"
            />
            Remember me
          </label>
          <a href="/forgot-password" className="login-forgot-link">
            Forgot password?
          </a>
        </div>

        {/* ── Submit Button ── */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || isSuccess}
          className={`login-btn ${isSuccess ? 'login-btn--success' : ''}`}
        >
          {isLoading ? (
            <><Spinner /> Signing in…</>
          ) : isSuccess ? (
            <>✓ Signed in</>
          ) : (
            'Sign in'
          )}
        </button>

        <Divider label="Don't have an account?" />

        {/* ── Register link ── */}
        <a href="/register" className="login-register-btn">
          Create a free account
        </a>

      </div>

      {/* ── Footer note ── */}
      <p className="login-footer">
        By signing in you agree to our{' '}
        <a href="/terms">Terms</a> &amp;{' '}
        <a href="/privacy">Privacy</a>
      </p>
    </div>
  );
}