// src/components/charts/TaskTimelineChart.jsx
// Feature 6.1 — Tasks completed per day over the trailing N days

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TaskTimelineChart({ data }) {
  const hasActivity = data.some((d) => d.completed > 0);

  return (
    <div style={styles.wrap}>
      <p style={styles.title}>Completed tasks — last {data.length} days</p>
      {!hasActivity ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
          No tasks completed in this period
        </div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tc-timeline-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EEF5" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={formatDay}
                formatter={(value) => [`${value} completed`, '']}
                contentStyle={{ borderRadius: 10, border: '1px solid #E0DFF5', fontSize: 13 }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#6C63FF"
                strokeWidth={2}
                fill="url(#tc-timeline-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #E0DFF5',
    padding: '18px 20px',
    flex: 1,
    minWidth: 280,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
};