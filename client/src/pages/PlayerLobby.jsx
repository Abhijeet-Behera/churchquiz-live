import React, {
  useEffect
} from 'react';

import {
  useNavigate,
  useParams
} from 'react-router-dom';

import { useGame } from '../context/GameContext';
import { LoadingState } from '../components/LoadingState';

export function PlayerLobby() {
  const { pin: paramPin } =
    useParams();

  const navigate =
    useNavigate();

  const {
    player,
    pin,
    gameStatus,
    sessionRestoring
  } = useGame();

  const currentPin =
    pin || paramPin;

  useEffect(() => {
    if (sessionRestoring) {
      return;
    }

    /**
     * If the question is active OR results
     * are already being shown, send the
     * restored player back into PlayerGame.
     */
    if (
      (
        gameStatus ===
        'QUESTION_ACTIVE' ||
        gameStatus ===
        'QUESTION_RESULT'
      ) &&
      currentPin
    ) {
      navigate(
        `/play/${currentPin}/game`,
        {
          replace: true
        }
      );

      return;
    }

    if (
      gameStatus ===
      'FINISHED' &&
      currentPin
    ) {
      navigate(
        `/play/${currentPin}/results`,
        {
          replace: true
        }
      );

      return;
    }

    /**
     * No valid player after restoration means
     * this browser is not currently in a game.
     */
    if (!player) {
      navigate('/join', {
        replace: true
      });
    }
  }, [
    sessionRestoring,
    player,
    gameStatus,
    currentPin,
    navigate
  ]);

  if (sessionRestoring) {
    return (
      <div
        className="app-container"
        style={{
          justifyContent:
            'center',
          alignItems: 'center'
        }}
      >
        <LoadingState message="Restoring your game..." />
      </div>
    );
  }

  if (!player) {
    return null;
  }

  return (
    <div
      className="app-container"
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%'
        }}
      >
        <div
          style={{
            fontSize: '3.5rem',
            marginBottom: '1rem'
          }}
        >
          🎉
        </div>

        <h2
          style={{
            fontSize: '2rem',
            marginBottom: '0.5rem',
            color:
              'var(--accent-gold)'
          }}
        >
          You're in, {player.name}!
        </h2>

        <p
          style={{
            color:
              'var(--text-muted)',
            fontSize: '1.1rem',
            marginBottom: '2rem'
          }}
        >
          See your name on the host projector screen.
          Get ready for Question 1!
        </p>

        <div
          style={{
            background:
              'var(--bg-surface)',
            padding: '1rem',
            borderRadius:
              'var(--radius-sm)',
            fontSize: '0.95rem',
            color:
              'var(--text-muted)'
          }}
        >
          Game PIN:{' '}
          <strong
            style={{
              color:
                'var(--text-main)'
            }}
          >
            {currentPin}
          </strong>
        </div>

        <p
          style={{
            marginTop: '1rem',
            marginBottom: 0,
            color:
              'var(--text-muted)',
            fontSize: '0.8rem'
          }}
        >
          You can safely refresh this page if needed.
        </p>
      </div>
    </div>
  );
}

export default PlayerLobby;