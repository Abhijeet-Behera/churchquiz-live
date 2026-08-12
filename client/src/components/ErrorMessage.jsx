import React from 'react';

export function ErrorMessage({ message, onClose }) {
  if (!message) return null;

  return (
    <div style={{
      background: '#991b1b',
      border: '1px solid #f87171',
      color: '#fef2f2',
      padding: '1rem 1.5rem',
      borderRadius: 'var(--radius-sm)',
      margin: '1rem 0',
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between'
    }}>
      <span>⚠️ {typeof message === 'string' ? message : message.message || 'An error occurred'}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#white',
            fontSize: '1.25rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
