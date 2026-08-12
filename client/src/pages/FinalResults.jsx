import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Leaderboard } from '../components/Leaderboard';

const APP_MODE = import.meta.env.VITE_APP_MODE;

export function FinalResults() {
  const navigate = useNavigate();
  const { leaderboard, players, player, role, resetGame } = useGame();

  const finalRankings = leaderboard.length > 0 ? leaderboard : players;
  const topWinner = finalRankings[0];
  const selfRank = finalRankings.find(p => p.id === player?.id);

  const handleFinish = () => {
    resetGame();
    if (APP_MODE === 'host') {
      navigate('/host');
    } else if (APP_MODE === 'player') {
      navigate('/join');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="app-container" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👑</div>
        <h1 style={{ fontSize: '3rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
          Quiz Finished!
        </h1>
        {topWinner && (
          <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
            Congratulations <strong>{topWinner.name}</strong> for winning 1st place! 🎉
          </p>
        )}

        {role === 'player' && selfRank && (
          <div style={{
            background: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '2rem',
            fontSize: '1.25rem'
          }}>
            You finished <strong>#{selfRank.rank}</strong> with <strong>{selfRank.score} points</strong>!
          </div>
        )}

        <Leaderboard players={finalRankings} />

        <div style={{ marginTop: '2.5rem' }}>
          <button className="btn btn-primary" onClick={handleFinish} style={{ fontSize: '1.25rem', padding: '1rem 2rem' }}>
            🏠 Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
