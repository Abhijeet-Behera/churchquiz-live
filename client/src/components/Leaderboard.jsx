import React from 'react';
import { AnimatedLeaderboard } from './AnimatedLeaderboard';

/**
 * Leaderboard
 *
 * Props:
 * - players: array of player objects
 * - maxDisplay: maximum number of rows to show
 * - animated: when true, uses AnimatedLeaderboard
 * - title: optional title
 */
export function Leaderboard({
  players = [],
  maxDisplay = 10,
  animated = false,
  title = '🏆 Leaderboard'
}) {
  /**
   * Animated version
   *
   * This is intended for:
   * - projector leaderboard
   * - leaderboard presentation window
   * - round-to-round animated rank changes
   */
  if (animated) {
    return (
      <AnimatedLeaderboard
        players={players}
        maxDisplay={maxDisplay}
        title={title}
      />
    );
  }

  /**
   * Static version
   *
   * Useful for:
   * - host preview
   * - non-animated screens
   * - fallback rendering
   */
  const displayList = Array.isArray(players)
    ? players.slice(0, maxDisplay)
    : [];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '700px',
        margin: '0 auto'
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: '2rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: 'var(--accent-gold)'
          }}
        >
          {title}
        </h2>
      )}

      <ul
        className="leaderboard-list"
        role="list"
        aria-label="Leaderboard"
        style={{
          padding: 0,
          margin: 0,
          listStyle: 'none'
        }}
      >
        {displayList.map((player, index) => {
          const rank =
            typeof player.rank === 'number'
              ? player.rank
              : index + 1;

          const rankClass =
            rank >= 1 && rank <= 3
              ? `rank-${rank}`
              : '';

          return (
            <li
              key={player.id || `player-${index}`}
              className={`leaderboard-item ${rankClass}`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  minWidth: 0
                }}
              >
                {/* Rank */}
                <span
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    width: '40px',
                    flexShrink: 0,
                    textAlign: 'right',
                    color:
                      rank === 1
                        ? 'var(--accent-gold)'
                        : 'var(--text-main)'
                  }}
                >
                  #{rank}
                </span>

                {/* Player name */}
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {player.name}
                </span>
              </div>

              {/* Score */}
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '900',
                  color: 'var(--accent-gold)',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0
                }}
              >
                {player.score || 0} pts
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Leaderboard;