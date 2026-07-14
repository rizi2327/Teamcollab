// src/pages/AcceptInvite.jsx
// Feature 2.3 — Landing page for invite links: /invites/:token
//
// Flow:
//   1. Fetch invite preview (no auth needed) → shows "X invited you to Y"
//   2. If not logged in → show Login/Register buttons (redirect back here after)
//   3. If logged in with matching email → Accept / Decline buttons
//   4. If logged in with DIFFERENT email → show warning, can't accept

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useInvite } from '../hooks/useInvite';
import '../styles/AcceptInvite.css';

function Spin() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="tc-spinner">
      <circle cx="12" cy="12" r="10" stroke="#E0DFF5" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#6C63FF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn, loading: authLoading } = useAuthContext();
  const { getInvitePreview, acceptInvite, declineInvite } = useInvite();

  const [invite, setInvite]   = useState(null);
  const [status, setStatus]   = useState('loading'); // loading | preview | error | accepted | declined
  const [errMsg, setErrMsg]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch preview on mount ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const result = await getInvitePreview(token);
      if (result.success) {
        setInvite(result.invite);
        setStatus('preview');
      } else {
        setErrMsg(result.message);
        setStatus('error');
      }
    };
    load();
  }, [token]);

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    setActionLoading(true);
    const result = await acceptInvite(token);
    setActionLoading(false);
    if (result.success) {
      setStatus('accepted');
      setTimeout(() => navigate('/dashboard'), 1600);
    } else {
      setErrMsg(result.message);
      setStatus('error');
    }
  };

  // ── Decline ───────────────────────────────────────────────────────────────
  const handleDecline = async () => {
    setActionLoading(true);
    const result = await declineInvite(token);
    setActionLoading(false);
    if (result.success) setStatus('declined');
  };

  const emailMatches = isLoggedIn && user?.email?.toLowerCase() === invite?.email?.toLowerCase();

  return (
    <div className="ai-page">
      <div className="ai-bg-circle-1" />
      <div className="ai-bg-circle-2" />

      <div className="ai-card">
        {/* ── Loading ── */}
        {(status === 'loading' || authLoading) && (
          <div className="ai-center">
            <Spin />
            <p className="ai-loading-text">Loading invite…</p>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="ai-center">
            <div className="ai-center-icon">⚠️</div>
            <h2 className="ai-title">Invite unavailable</h2>
            <p className="ai-subtitle">{errMsg}</p>
            <a href="/dashboard" className="ai-primary-btn-link">Go to dashboard</a>
          </div>
        )}

        {/* ── Declined ── */}
        {status === 'declined' && (
          <div className="ai-center">
            <div className="ai-center-icon">👋</div>
            <h2 className="ai-title">Invite declined</h2>
            <p className="ai-subtitle">No worries — you can ask for a new invite anytime.</p>
            <a href="/dashboard" className="ai-primary-btn-link">Go to dashboard</a>
          </div>
        )}

        {/* ── Accepted ── */}
        {status === 'accepted' && (
          <div className="ai-center">
            <div className="ai-center-icon">🎉</div>
            <h2 className="ai-title">You're in!</h2>
            <p className="ai-subtitle">Redirecting to your dashboard…</p>
          </div>
        )}

        {/* ── Preview — main invite card ── */}
        {status === 'preview' && invite && (
          <div>
            {/* Workspace icon + name */}
            <div className="ai-preview-header">
              <div
                className="ai-workspace-icon"
                style={{ '--workspace-color': invite.workspace?.color || '#6C63FF' }}
              >
                {invite.workspace?.icon || '🏢'}
              </div>
              <h2 className="ai-title">
                You're invited to <span className="ai-accent">{invite.workspace?.name}</span>
              </h2>
              <p className="ai-subtitle">
                {invite.invitedBy?.name} invited you to join as <strong>{invite.role}</strong>
              </p>
            </div>

            {/* Invite details */}
            <div className="ai-details-box">
              <div className="ai-detail-row">
                <span className="ai-detail-label">Invited email</span>
                <span className="ai-detail-value">{invite.email}</span>
              </div>
              <div className="ai-detail-row">
                <span className="ai-detail-label">Role</span>
                <span className="ai-detail-value">{invite.role}</span>
              </div>
              <div className="ai-detail-row">
                <span className="ai-detail-label">Expires</span>
                <span className="ai-detail-value">
                  {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* ── Not logged in ── */}
            {!isLoggedIn && (
              <div className="ai-guest-actions">
                <p className="ai-guest-hint">
                  Sign in or create an account with <strong>{invite.email}</strong> to accept
                </p>
                <a href={`/login?redirect=/invites/${token}`} className="ai-primary-btn-link">
                  Sign in to accept
                </a>
                <a href={`/register?redirect=/invites/${token}`} className="ai-outline-btn-link">
                  Create an account
                </a>
              </div>
            )}

            {/* ── Logged in, email mismatch ── */}
            {isLoggedIn && !emailMatches && (
              <div className="ai-mismatch-wrap">
                <div className="ai-warning-box">
                  ⚠️ This invite was sent to <strong>{invite.email}</strong>, but you're signed in as <strong>{user?.email}</strong>.
                  Please sign in with the correct account.
                </div>
              </div>
            )}

            {/* ── Logged in, email matches → can accept/decline ── */}
            {isLoggedIn && emailMatches && (
              <div className="ai-actions-row">
                <button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className={`ai-primary-btn ${actionLoading ? 'loading' : ''}`}
                >
                  {actionLoading ? 'Joining…' : '✓ Accept invite'}
                </button>
                <button onClick={handleDecline} disabled={actionLoading} className="ai-decline-btn">
                  Decline
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}