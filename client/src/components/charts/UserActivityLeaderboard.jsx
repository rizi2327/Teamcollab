// src/components/charts/UserActivityLeaderboard.jsx
// Feature 6.1 — Per-member assigned/completed task stats, sorted by activity

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function avatarColor(name = '') {
  const palette = ['#6C63FF', '#EF9F27', '#5FA021', '#E24B4A', '#2C9CDB', '#B15FD3'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function UserActivityLeaderboard({ data }) {
  return (
    <div style={styles.wrap}>
      <p style={styles.title}>Member activity</p>

      {data.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
          No members yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.map((member) => (
            <div key={member.userId} style={styles.row}>
              <div style={{ ...styles.avatar, background: avatarColor(member.name) }}>
                {initials(member.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.name}>{member.name}</p>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${member.completionRate}%`,
                    }}
                  />
                </div>
              </div>

              <div style={styles.statsCol}>
                <p style={styles.statsMain}>{member.completed}/{member.assigned}</p>
                <p style={styles.statsSub}>{member.completionRate}% done</p>
              </div>
            </div>
          ))}
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
    margin: '0 0 10px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 0',
    borderBottom: '1px solid #F5F3FA',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 5px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  barTrack: {
    height: 5,
    borderRadius: 99,
    background: '#F0EEF5',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    background: '#6C63FF',
    transition: 'width .3s ease',
  },
  statsCol: {
    textAlign: 'right',
    flexShrink: 0,
    width: 68,
  },
  statsMain: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  statsSub: {
    fontSize: 11,
    color: '#aaa',
    margin: '2px 0 0',
  },
};