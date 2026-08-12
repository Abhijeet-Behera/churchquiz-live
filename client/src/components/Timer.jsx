import React, { useState, useEffect } from 'react';

export function Timer({ questionEndsAt, duration = 15, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!questionEndsAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, questionEndsAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setTimeLeft(remainingSec);

      if (remainingMs <= 0) {
        clearInterval(interval);
        if (typeof onExpire === 'function') onExpire();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [questionEndsAt, onExpire]);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: timeLeft <= 5 ? '#e11d48' : '#1e293b',
      border: '4px solid var(--accent-gold)',
      color: '#ffffff',
      fontSize: '2rem',
      fontWeight: '800',
      transition: 'background 0.3s ease'
    }}>
      {timeLeft}
    </div>
  );
}
