// src/components/charts/StatusDonutChart.jsx
// Feature 6.1 — Task status breakdown donut (To Do / In Progress / Done)

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  'To Do':        '#B0AEC5',
  'In Progress':  '#EF9F27',
  'Done':         '#5FA021',
};

export default function StatusDonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div style={styles.wrap}>
        <p style={styles.title}>Status breakdown</p>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.title}>Status breakdown</p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || '#6C63FF'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} tasks`, name]}
              contentStyle={{ borderRadius: 10, border: '1px solid #E0DFF5', fontSize: 13 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: '#666' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
      No tasks yet
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