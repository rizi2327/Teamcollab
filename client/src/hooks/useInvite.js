// src/hooks/useInvite.js
// Feature 2.3 — All invite-related API calls in one place

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useInvite() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Send invite ──────────────────────────────────────────────────────────
  const sendInvite = useCallback(async (workspaceId, { email, role }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/workspaces/${workspaceId}/invite`, { email, role });
      return { success: true, invite: data.invite, message: data.message, devLink: data.devInviteLink };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send invite';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── List pending invites ─────────────────────────────────────────────────
  const getInvites = useCallback(async (workspaceId) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/workspaces/${workspaceId}/invites`);
      return { success: true, invites: data.invites };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to load invites' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Revoke invite ────────────────────────────────────────────────────────
  const revokeInvite = useCallback(async (workspaceId, inviteId) => {
    try {
      await axios.delete(`${API_URL}/workspaces/${workspaceId}/invites/${inviteId}`);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to revoke invite' };
    }
  }, []);

  // ── Remove member ────────────────────────────────────────────────────────
  const removeMember = useCallback(async (workspaceId, userId) => {
    try {
      const { data } = await axios.delete(`${API_URL}/workspaces/${workspaceId}/members/${userId}`);
      return { success: true, workspace: data.workspace };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to remove member' };
    }
  }, []);

  // ── Get invite preview (public-ish, by token) ────────────────────────────
  const getInvitePreview = useCallback(async (token) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/invites/${token}`);
      return { success: true, invite: data.invite };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invite not found' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Accept invite ────────────────────────────────────────────────────────
  const acceptInvite = useCallback(async (token) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/invites/${token}/accept`);
      return { success: true, workspace: data.workspace, message: data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to accept invite' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Decline invite ───────────────────────────────────────────────────────
  const declineInvite = useCallback(async (token) => {
    try {
      await axios.post(`${API_URL}/invites/${token}/decline`);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to decline invite' };
    }
  }, []);

  return {
    loading, error,
    sendInvite, getInvites, revokeInvite, removeMember,
    getInvitePreview, acceptInvite, declineInvite,
  };
}