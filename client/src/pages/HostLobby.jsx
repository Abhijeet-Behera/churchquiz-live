import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { PlayerList } from '../components/PlayerList';
import { ErrorMessage } from '../components/ErrorMessage';
import HostQuickSignOut from '../components/HostQuickSignOut';

export function HostLobby() {
  const { pin: paramPin } = useParams();
  const navigate = useNavigate();
  const { pin, players, startGame, gameStatus, error, clearError } = useGame();

  const currentPin = pin || paramPin;

  useEffect(() => {
    if (gameStatus === 'QUESTION_ACTIVE' && currentPin) {
      navigate(`/host/${currentPin}/game`);
    }
  }, [gameStatus, currentPin, navigate]);

  const handleStart = () => {
    startGame();
  };

  return (
    <div className="app-container" style={{ textAlign: 'center' }}>
      <HostQuickSignOut />
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          JOIN AT YOUR MOBILE BROWSER WITH GAME PIN
        </h3>
        <div className="badge-pin" style={{ display: 'inline-block', margin: '1rem 0' }}>
          {currentPin}
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Players joined: <strong style={{ color: 'var(--accent-gold)', fontSize: '1.25rem' }}>{players.length}</strong>
        </p>
      </div>

      {error && <ErrorMessage message={error} onClose={clearError} />}

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Lobby Players</h3>
        <PlayerList players={players} />

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={players.length === 0}
            style={{ fontSize: '1.5rem', padding: '1.25rem 3rem' }}
          >
            🚀 Start Quiz Now
          </button>
        </div>
      </div>
    </div>
  );
}
