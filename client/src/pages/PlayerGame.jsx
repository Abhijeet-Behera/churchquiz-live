import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useGame } from '../context/GameContext';
import { AnswerOption } from '../components/AnswerOption';
import { ErrorMessage } from '../components/ErrorMessage';

export function PlayerGame() {
  const { pin: paramPin } = useParams();
  const navigate = useNavigate();

  const {
    pin,
    currentQuestion,
    selectedOption,
    answerResult,
    gameStatus,
    player,
    submitAnswer,
    error,
    clearError
  } = useGame();

  const currentPin = pin || paramPin;

  /**
   * Move player to results when quiz finishes.
   */
  useEffect(() => {
    if (gameStatus === 'FINISHED') {
      navigate(
        currentPin
          ? `/play/${currentPin}/results`
          : '/results',
        {
          replace: true
        }
      );
    }
  }, [
    gameStatus,
    currentPin,
    navigate
  ]);

  /**
   * If question data has not arrived yet,
   * show a syncing message instead of a blank page.
   */
  if (!currentQuestion) {
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
            maxWidth: '420px',
            width: '100%'
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              marginBottom: '1rem'
            }}
          >
            ⏳
          </div>

          <h2
            style={{
              color: 'var(--accent-gold)',
              marginBottom: '0.5rem'
            }}
          >
            Waiting for Question
          </h2>

          <p
            style={{
              color: 'var(--text-muted)'
            }}
          >
            The next question will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  const isLocked =
    selectedOption !== null;

  const isResultPhase =
    gameStatus === 'QUESTION_RESULT';

  return (
    <div
      className="app-container"
      style={{
        justifyContent: 'space-between',
        maxWidth: '600px'
      }}
    >
      {/* ======================================
          PLAYER HEADER
         ====================================== */}

      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          marginBottom: '1rem'
        }}
      >
        {/* PLAYER NAME */}

        <div>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}
          >
            PLAYER
          </div>

          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: '800'
            }}
          >
            {player?.name || 'Player'}
          </div>
        </div>

        {/* RANK */}

        <div
          style={{
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}
          >
            RANK
          </div>

          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: '800',
              color: 'var(--accent-gold)'
            }}
          >
            #{player?.rank || 1}
          </div>
        </div>

        {/* SCORE */}

        <div
          style={{
            textAlign: 'right'
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}
          >
            SCORE
          </div>

          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: '800',
              color: 'var(--accent-gold)'
            }}
          >
            {player?.score || 0} pts
          </div>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <ErrorMessage
          message={
            error?.message ||
            error
          }
          onClose={clearError}
        />
      )}

      {/* ======================================
          ACTIVE QUESTION
         ====================================== */}

      {!isResultPhase ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontWeight: '700',
              fontSize: '1.2rem'
            }}
          >
            Question{' '}
            {currentQuestion.questionIndex + 1}
            {currentQuestion.totalQuestions
              ? ` of ${currentQuestion.totalQuestions}`
              : ''}
          </div>

          {/* ANSWER OPTIONS */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}
          >
            {Array.isArray(
              currentQuestion.options
            ) &&
              currentQuestion.options.map(
                (optText, idx) => (
                  <AnswerOption
                    key={idx}
                    index={idx}
                    text={optText}
                    isSelected={
                      selectedOption === idx
                    }
                    disabled={isLocked}
                    onClick={() =>
                      submitAnswer(idx)
                    }
                  />
                )
              )}
          </div>

          {/* ANSWER LOCKED */}

          {isLocked && (
            <div
              className="card"
              style={{
                marginTop: '2rem',
                textAlign: 'center',
                background:
                  'var(--bg-surface)'
              }}
            >
              <div
                style={{
                  fontSize: '2rem',
                  marginBottom: '0.5rem'
                }}
              >
                🔒
              </div>

              <h3
                style={{
                  color:
                    'var(--accent-gold)'
                }}
              >
                Answer Locked In
              </h3>

              <p
                style={{
                  color:
                    'var(--text-muted)',
                  marginTop: '0.25rem'
                }}
              >
                Waiting for the round to finish...
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ======================================
           RESULT PHASE
           ====================================== */

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <div
            className="card"
            style={{
              background:
                answerResult?.isCorrect
                  ? 'rgba(5, 150, 105, 0.2)'
                  : 'rgba(225, 29, 72, 0.2)',

              border:
                answerResult?.isCorrect
                  ? '2px solid #10b981'
                  : '2px solid #f43f5e',

              padding: '2.5rem 1.5rem'
            }}
          >
            <div
              style={{
                fontSize: '4rem',
                marginBottom: '1rem'
              }}
            >
              {answerResult?.isCorrect
                ? '✅'
                : '❌'}
            </div>

            <h2
              style={{
                fontSize: '2.25rem',
                marginBottom: '0.5rem'
              }}
            >
              {answerResult?.isCorrect
                ? 'Correct!'
                : 'Incorrect'}
            </h2>

            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                color: 'var(--accent-gold)',
                margin: '1rem 0'
              }}
            >
              +
              {answerResult?.pointsAwarded ||
                0}{' '}
              pts
            </div>

            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '1.1rem'
              }}
            >
              Your Total Score:{' '}
              <strong
                style={{
                  color: '#ffffff'
                }}
              >
                {player?.score || 0} pts
              </strong>
            </div>

            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '1.1rem',
                marginTop: '0.5rem'
              }}
            >
              Current Rank:{' '}
              <strong
                style={{
                  color:
                    'var(--accent-gold)'
                }}
              >
                #{player?.rank || 1}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerGame;