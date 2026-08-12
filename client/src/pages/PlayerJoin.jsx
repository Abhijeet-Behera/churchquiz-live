import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { ErrorMessage } from '../components/ErrorMessage';

export function PlayerJoin() {
  const [pinInput, setPinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const navigate = useNavigate();
  const { joinGame, player, pin, loading, error, clearError } = useGame();

  useEffect(() => {
    if (player && pin) {
      navigate(`/play/${pin}/lobby`);
    }
  }, [player, pin, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pinInput.trim() || !nameInput.trim()) return;
    joinGame(pinInput.trim(), nameInput.trim());
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>
          Join Game
        </h2>

        {error && <ErrorMessage message={error} onClose={clearError} />}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="input-field"
            placeholder="6-Digit Game PIN"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            style={{ textAlign: 'center', letterSpacing: '0.2rem', fontSize: '1.5rem', fontWeight: '700' }}
            required
          />

          <input
            type="text"
            className="input-field"
            placeholder="Your Display Name"
            maxLength={20}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || pinInput.length !== 6 || !nameInput.trim()}
            style={{ width: '100%', fontSize: '1.25rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Joining...' : 'Enter Lobby 🎯'}
          </button>
        </form>
      </div>
    </div>
  );
}
