// src/hooks/useAnalytics.js
// Feature 6.1 — Fetches all dashboard/analytics data for a workspace.
// Kept as one hook (rather than 5 separate ones) since the dashboard page
// always needs all five data sets together and refreshes them as a unit.

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const EMPTY_OVERVIEW = {
  total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0, completionRate: 0,
};

export function useAnalytics(workspaceId, { timelineDays = 14 } = {}) {
  const [overview,           setOverview]           = useState(EMPTY_OVERVIEW);
  const [statusBreakdown,    setStatusBreakdown]    = useState([]);
  const [priorityBreakdown,  setPriorityBreakdown]  = useState([]);
  const [timeline,           setTimeline]           = useState([]);
  const [activity,           setActivity]           = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');

  const fetchAll = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const base = `${API_URL}/analytics/${workspaceId}`;
      const [overviewRes, statusRes, priorityRes, timelineRes, activityRes] = await Promise.all([
        axios.get(`${base}/overview`),
        axios.get(`${base}/status-breakdown`),
        axios.get(`${base}/priority-breakdown`),
        axios.get(`${base}/timeline`, { params: { days: timelineDays } }),
        axios.get(`${base}/activity`),
      ]);

      setOverview(overviewRes.data.overview);
      setStatusBreakdown(statusRes.data.breakdown);
      setPriorityBreakdown(priorityRes.data.breakdown);
      setTimeline(timelineRes.data.timeline);
      setActivity(activityRes.data.activity);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, timelineDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    overview,
    statusBreakdown,
    priorityBreakdown,
    timeline,
    activity,
    loading,
    error,
    refresh: fetchAll,
  };
}