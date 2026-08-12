import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const APP_MODE = import.meta.env.VITE_APP_MODE;

export function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (APP_MODE === 'host') {
      navigate('/host');
    } else if (APP_MODE === 'player') {
      navigate('/join');
    }
  }, [navigate]);

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
          ChurchQuiz Live
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
          Real-time interactive Bible quiz for youth events & church gatherings
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/join')}
            style={{ fontSize: '1.35rem', padding: '1.25rem' }}
          >
            📱 Join a Game as Player
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/host')}
            style={{ fontSize: '1.25rem', padding: '1rem' }}
          >
            🖥️ Host a Game (Projector Mode)
          </button>
        </div>
      </div>
    </div>
  );
}
