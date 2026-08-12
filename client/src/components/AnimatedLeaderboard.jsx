import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';

const RANK_COLORS = {
  up: '#10b981',
  down: '#f43f5e',
  same: '#94a3b8'
};

const ANIMATION_DURATION = 750;
const SCORE_ANIMATION_DURATION = 600;

/**
 * Returns whether the user/browser prefers reduced motion.
 */
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(() => {
      if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      ) {
        return false;
      }

      return window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    });

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    // Older browser fallback
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);

      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }

    return undefined;
  }, []);

  return prefersReducedMotion;
}

/**
 * Animates a numeric value from its previous value
 * to the new value.
 */
function useCountUp(
  value,
  duration = SCORE_ANIMATION_DURATION
) {
  const numericValue =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : 0;

  const [displayValue, setDisplayValue] =
    useState(numericValue);

  const previousValueRef =
    useRef(numericValue);

  const animationFrameRef =
    useRef(null);

  const prefersReducedMotion =
    usePrefersReducedMotion();

  useEffect(() => {
    const start =
      previousValueRef.current;

    const end =
      numericValue;

    if (
      prefersReducedMotion ||
      start === end
    ) {
      setDisplayValue(end);
      previousValueRef.current = end;

      return undefined;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    const startedAt =
      performance.now();

    const tick = (now) => {
      const elapsed =
        now - startedAt;

      const progress =
        Math.min(
          elapsed / duration,
          1
        );

      // Ease-out quadratic
      const eased =
        1 -
        (1 - progress) *
        (1 - progress);

      const nextValue =
        Math.round(
          start +
          (end - start) *
          eased
        );

      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameRef.current =
          requestAnimationFrame(tick);
      } else {
        previousValueRef.current =
          end;

        animationFrameRef.current =
          null;
      }
    };

    animationFrameRef.current =
      requestAnimationFrame(tick);

    return () => {
      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }
    };
  }, [
    numericValue,
    duration,
    prefersReducedMotion
  ]);

  return displayValue;
}

/**
 * One row of the leaderboard.
 */
function LeaderboardRow({
  player,
  innerRef
}) {
  const score =
    useCountUp(
      player.score || 0
    );

  const delta =
    typeof player.rankDelta === 'number'
      ? player.rankDelta
      : 0;

  let indicator = '—';
  let indicatorColor =
    RANK_COLORS.same;
  let indicatorLabel =
    'unchanged';

  if (delta > 0) {
    indicator = `↑${delta}`;
    indicatorColor =
      RANK_COLORS.up;

    indicatorLabel =
      `moved up ${delta} ${delta === 1
        ? 'position'
        : 'positions'
      }`;
  } else if (delta < 0) {
    const amount =
      Math.abs(delta);

    indicator = `↓${amount}`;
    indicatorColor =
      RANK_COLORS.down;

    indicatorLabel =
      `moved down ${amount} ${amount === 1
        ? 'position'
        : 'positions'
      }`;
  }

  const rank =
    typeof player.rank === 'number'
      ? player.rank
      : 0;

  const rankClass =
    rank >= 1 && rank <= 3
      ? `rank-${rank}`
      : '';

  return (
    <li
      ref={innerRef}
      className={`leaderboard-item ${rankClass}`}
      aria-label={`Rank ${rank}: ${player.name}, ${player.score || 0
        } points, ${indicatorLabel}`}
      style={{
        willChange: 'transform',
        transformOrigin: 'center',
        backfaceVisibility: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minWidth: 0
        }}
      >
        {/* Rank */}
        <span
          style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            width: '44px',
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

        {/* Rank movement */}
        <span
          aria-label={indicatorLabel}
          title={indicatorLabel}
          style={{
            fontSize: '0.85rem',
            fontWeight: '800',
            color: indicatorColor,
            width: '42px',
            flexShrink: 0,
            textAlign: 'center',
            fontVariantNumeric:
              'tabular-nums'
          }}
        >
          {indicator}
        </span>

        {/* Player name */}
        <span
          style={{
            fontSize: '1.15rem',
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
          fontSize: '1.4rem',
          fontWeight: '900',
          color:
            'var(--accent-gold)',
          fontVariantNumeric:
            'tabular-nums',
          flexShrink: 0
        }}
      >
        {score} pts
      </div>
    </li>
  );
}

/**
 * Animated leaderboard using the FLIP technique.
 *
 * FLIP:
 *
 * FIRST:
 * Keep each player's position from the PREVIOUS render.
 *
 * LAST:
 * React renders the new leaderboard order.
 *
 * INVERT:
 * Calculate:
 *
 * previous position - current position
 *
 * and temporarily move the row back to its old visual position.
 *
 * PLAY:
 * Animate from the old visual position to the new position.
 */
export function AnimatedLeaderboard({
  players = [],
  maxDisplay = 10,
  title = '🏆 Leaderboard'
}) {
  const prefersReducedMotion =
    usePrefersReducedMotion();

  /*
   * Only show the requested number of
   * leaderboard positions.
   *
   * Server should already send players
   * sorted by rank.
   */
  const displayList =
    Array.isArray(players)
      ? players.slice(
        0,
        maxDisplay
      )
      : [];

  /*
   * playerId -> DOM element
   */
  const rowRefs =
    useRef({});

  /*
   * playerId -> previous DOM rectangle
   *
   * THIS is the important FLIP fix.
   *
   * These rectangles come from the
   * PREVIOUS render, not the current render.
   */
  const previousRectsRef =
    useRef({});

  /*
   * Keep references to active animations
   * so they can be cancelled if another
   * leaderboard update arrives quickly.
   */
  const activeAnimationsRef =
    useRef(new Map());

  /*
   * Build a dependency that changes whenever
   * leaderboard ordering/rank changes.
   */
  const leaderboardSignature =
    displayList
      .map(
        (player) =>
          `${player.id}:${player.rank}:${player.score}`
      )
      .join('|');

  useLayoutEffect(() => {
    const currentRects = {};

    /*
     * Clean refs belonging to players that are
     * no longer visible in the Top N.
     */
    const visibleIds =
      new Set(
        displayList.map(
          player => player.id
        )
      );

    for (
      const id of
      Object.keys(
        rowRefs.current
      )
    ) {
      if (!visibleIds.has(id)) {
        delete rowRefs.current[id];
      }
    }

    /*
     * Read CURRENT / LAST positions.
     */
    for (
      const [
        playerId,
        element
      ] of Object.entries(
        rowRefs.current
      )
    ) {
      if (!element) {
        continue;
      }

      const rect =
        element.getBoundingClientRect();

      currentRects[playerId] = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    }

    /*
     * With reduced motion enabled:
     * simply save current rectangles and stop.
     */
    if (prefersReducedMotion) {
      previousRectsRef.current =
        currentRects;

      return undefined;
    }

    /*
     * Cancel existing animations before
     * beginning a new leaderboard transition.
     */
    for (
      const animation of
      activeAnimationsRef.current.values()
    ) {
      try {
        animation.cancel();
      } catch {
        // Ignore cancellation errors
      }
    }

    activeAnimationsRef.current.clear();

    /*
     * Compare PREVIOUS/FIRST positions
     * with CURRENT/LAST positions.
     */
    for (
      const [
        playerId,
        element
      ] of Object.entries(
        rowRefs.current
      )
    ) {
      if (!element) {
        continue;
      }

      const previousRect =
        previousRectsRef.current[
        playerId
        ];

      const currentRect =
        currentRects[playerId];

      /*
       * New entrant into Top 10:
       * no previous rectangle exists,
       * therefore no movement animation.
       */
      if (
        !previousRect ||
        !currentRect
      ) {
        continue;
      }

      const deltaX =
        previousRect.left -
        currentRect.left;

      const deltaY =
        previousRect.top -
        currentRect.top;

      /*
       * No meaningful movement.
       */
      if (
        Math.abs(deltaX) < 1 &&
        Math.abs(deltaY) < 1
      ) {
        continue;
      }

      /*
       * Preferred implementation:
       * Web Animations API.
       *
       * The element currently exists in its
       * NEW DOM position.
       *
       * We visually begin it at the OLD
       * position and animate toward 0.
       */
      if (
        typeof element.animate ===
        'function'
      ) {
        const animation =
          element.animate(
            [
              {
                transform:
                  `translate(${deltaX}px, ${deltaY}px)`
              },
              {
                transform:
                  'translate(0px, 0px)'
              }
            ],
            {
              duration:
                ANIMATION_DURATION,

              easing:
                'cubic-bezier(0.4, 0, 0.2, 1)',

              fill: 'both'
            }
          );

        activeAnimationsRef.current.set(
          playerId,
          animation
        );

        const cleanup = () => {
          if (
            activeAnimationsRef.current.get(
              playerId
            ) === animation
          ) {
            activeAnimationsRef.current.delete(
              playerId
            );
          }
        };

        animation.onfinish =
          cleanup;

        animation.oncancel =
          cleanup;
      } else {
        /*
         * Fallback for browsers without
         * Element.animate().
         */
        element.style.transition =
          'none';

        element.style.transform =
          `translate(${deltaX}px, ${deltaY}px)`;

        // Force layout so the browser registers
        // the inverted position.
        void element.offsetWidth;

        requestAnimationFrame(
          () => {
            element.style.transition =
              `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;

            element.style.transform =
              'translate(0px, 0px)';
          }
        );
      }
    }

    /*
     * CRITICAL:
     *
     * Save CURRENT positions AFTER comparing.
     *
     * They become the FIRST positions for the
     * NEXT leaderboard update.
     */
    previousRectsRef.current =
      currentRects;

    return undefined;
  }, [
    leaderboardSignature,
    maxDisplay,
    prefersReducedMotion
  ]);

  /*
   * Cancel animations if component unmounts.
   */
  useEffect(() => {
    return () => {
      for (
        const animation of
        activeAnimationsRef.current.values()
      ) {
        try {
          animation.cancel();
        } catch {
          // Ignore cleanup error
        }
      }

      activeAnimationsRef.current.clear();
    };
  }, []);

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
            color:
              'var(--accent-gold)'
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
          position: 'relative',
          padding: 0,
          margin: 0,
          listStyle: 'none'
        }}
      >
        {displayList.map(
          (player) => (
            <LeaderboardRow
              key={player.id}
              player={player}
              innerRef={(element) => {
                if (element) {
                  rowRefs.current[
                    player.id
                  ] = element;
                } else {
                  delete rowRefs.current[
                    player.id
                  ];
                }
              }}
            />
          )
        )}
      </ul>
    </div>
  );
}

export default AnimatedLeaderboard;