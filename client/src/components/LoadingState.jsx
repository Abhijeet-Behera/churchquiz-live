import React from 'react';

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>
      <div style={{
        display: 'inline-block',
        width: '48px',
        height: '48px',
        border: '4px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '50%',
        borderTopColor: 'var(--accent-gold)',
        animation: 'spin 1s ease-in-out infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: '700' }}>
        {message}
      </div>
    </div>
  );
}
