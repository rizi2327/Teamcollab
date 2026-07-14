// src/components/charts/PriorityBarChart.jsx
// Feature 6.1 — Task priority breakdown (Low / Medium / High)

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const COLORS = {
  Low:    '#5FA021',
  Medium: '#EF9F27',
  High:   '#E24B4A',
};

export default function PriorityBarChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={styles.wrap}>
      <p style={styles.title}>Priority breakdown</p>
      {total === 0 ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
          No tasks yet
        </div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EEF5" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value} tasks`, 'Count']}
                contentStyle={{ borderRadius: 10, border: '1px solid #E0DFF5', fontSize: 13 }}
                cursor={{ fill: '#F5F5FB' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || '#6C63FF'} />
                ))}
              </Bar>
            </BarChart>
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