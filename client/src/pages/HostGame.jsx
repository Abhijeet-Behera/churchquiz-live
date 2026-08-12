import React, { useEffect } from 'react';
import HostQuickSignOut from '../components/HostQuickSignOut';
import { useNavigate, useParams } from 'react-router-dom';

import { useGame } from '../context/GameContext';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { Leaderboard } from '../components/Leaderboard';
import PresentationPanel from '../components/PresentationPanel';

export function HostGame() {
  const { pin: paramPin } = useParams();
  const navigate = useNavigate();

  const {
    pin,
    currentQuestion,
    gameStatus,
    answerResult,
    submittedCount,
    players,
    leaderboard,
    nextQuestion,
    endGame
  } = useGame();

  /**
   * Prefer the PIN stored in GameContext,
   * but fall back to the PIN from the URL.
   */
  const currentPin = pin || paramPin;

  /**
   * Redirect to final results when the game ends.
   */
  useEffect(() => {
    if (gameStatus === 'FINISHED') {
      navigate(
        currentPin
          ? `/host/${currentPin}/results`
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
   * The leaderboard supplied by the server
   * after a round should be preferred.
   *
   * Before the first leaderboard update,
   * fall back to the player list.
   */
  const leaderboardPlayers =
    Array.isArray(leaderboard) &&
      leaderboard.length > 0
      ? leaderboard
      : players;

  /**
   * Question-result state.
   */
  const isRevealed =
    gameStatus === 'QUESTION_RESULT';

  /**
   * If the game page is restoring after a refresh,
   * avoid showing a totally blank screen.
   */
  if (!currentQuestion) {
    return (
      <div
        className="app-container"
        style={{
          justifyContent: 'flex-start'
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '700px',
            width: '100%',
            margin: '2rem auto',
            textAlign: 'center'
          }}
        >
          <h2>
            Loading game…
          </h2>

          <p
            style={{
              color: 'var(--text-muted)'
            }}
          >
            Waiting for the current question state.
          </p>
        </div>

        {currentPin && (
          <PresentationPanel
            pin={currentPin}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="app-container"
      style={{
        justifyContent: 'space-between'
      }}
    >
      <HostQuickSignOut />
      {/* ========================================
          CURRENT QUESTION
         ======================================== */}

      <QuestionDisplay
        questionPayload={currentQuestion}
        isRevealed={isRevealed}
        correctOption={
          answerResult
            ? answerResult.correctOption
            : null
        }
        submittedCount={submittedCount}
        totalPlayers={players.length}
      />

      {/* ========================================
          EXPLANATION
         ======================================== */}

      {isRevealed &&
        answerResult?.explanation && (
          <div
            className="card"
            style={{
              maxWidth: '800px',
              width: '100%',
              margin: '2rem auto 0 auto',
              background:
                'rgba(251, 191, 36, 0.1)',
              border:
                '1px solid var(--accent-gold)',
              textAlign: 'center'
            }}
          >
            <h4
              style={{
                color:
                  'var(--accent-gold)',
                marginBottom:
                  '0.5rem'
              }}
            >
              💡 Explanation
            </h4>

            <p
              style={{
                fontSize: '1.2rem'
              }}
            >
              {
                answerResult.explanation
              }
            </p>
          </div>
        )}

      {/* ========================================
          HOST LEADERBOARD PREVIEW

          IMPORTANT:
          Keep this mounted during the entire
          question.

          If we mount/unmount AnimatedLeaderboard
          after every question, its previous DOM
          positions are lost and FLIP movement
          cannot animate properly.
         ======================================== */}

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '900px',
          margin: '2rem auto 0 auto'
        }}
      >
        {!isRevealed && (
          <p
            style={{
              textAlign: 'center',
              color:
                'var(--text-muted)',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}
          >
            Rankings update when the
            current round ends.
          </p>
        )}

        <Leaderboard
          players={leaderboardPlayers}
          maxDisplay={10}
          animated={true}
          title="🏆 Leaderboard"
        />
      </div>

      {/* ========================================
          QUESTION CONTROLS
         ======================================== */}

      {isRevealed && (
        <div
          style={{
            marginTop: '2rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={nextQuestion}
              style={{
                fontSize: '1.35rem',
                padding:
                  '1rem 2.5rem'
              }}
            >
              ➡️ Next Question
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={endGame}
              style={{
                fontSize: '1.1rem'
              }}
            >
              🛑 End Game
            </button>
          </div>
        </div>
      )}

      {/* ========================================
          PRESENTATION / EXTENDED DISPLAY CONTROLS
         ======================================== */}

      {currentPin && (
        <PresentationPanel
          pin={currentPin}
        />
      )}
    </div>
  );
}

export default HostGame;