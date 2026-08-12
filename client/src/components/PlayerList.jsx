import React from 'react';

export function PlayerList({ players = [] }) {
  if (players.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.25rem', padding: '2rem' }}>
        Waiting for players to enter PIN and join...
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '1rem',
      width: '100%',
      marginTop: '1.5rem'
    }}>
      {players.map((p) => (
        <div key={p.id} style={{
          background: 'var(--bg-surface)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          fontWeight: '700',
          fontSize: '1.15rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          opacity: p.connected !== false ? 1 : 0.5
        }}>
          {p.name} {p.connected === false && '(offline)'}
        </div>
      ))}
    </div>
  );
}
