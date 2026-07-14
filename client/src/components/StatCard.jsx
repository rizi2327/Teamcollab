// src/components/StatCard.jsx
// Feature 6.1 — Single stat tile used in the analytics summary row

export default function StatCard({ label, value, icon, accent = '#6C63FF', suffix = '' }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.iconWrap, background: `${accent}1A` }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div>
        <p style={styles.value}>
          {value}
          {suffix && <span style={styles.suffix}>{suffix}</span>}
        </p>
        <p style={styles.label}>{label}</p>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #E0DFF5',
    padding: '18px 20px',
    flex: 1,
    minWidth: 160,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  value: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1a1a2e',
    margin: 0,
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
  },
  suffix: {
    fontSize: 14,
    fontWeight: 600,
    color: '#999',
    marginLeft: 2,
  },
  label: {
    fontSize: 12,
    color: '#999',
    margin: '3px 0 0',
    fontWeight: 500,
  },
};