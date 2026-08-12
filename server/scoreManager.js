const { SCORING } = require('./constants');

/**
 * Calculates the score for an answer based on correctness and response time.
 * Formula:
 *  - Incorrect: 0 points
 *  - Correct: 500 to 1000 points based on speed ratio
 * 
 * @param {boolean} isCorrect 
 * @param {number} responseTimeMs 
 * @param {number} durationMs 
 * @returns {number} score awarded (0 or 500..1000)
 */
function calculateScore(isCorrect, responseTimeMs, durationMs) {
  if (!isCorrect) {
    return SCORING.WRONG_SCORE;
  }

  const safeDurationMs = (typeof durationMs === 'number' && durationMs > 0) ? durationMs : 15000;
  const safeResponseMs = (typeof responseTimeMs === 'number' && responseTimeMs >= 0) ? responseTimeMs : safeDurationMs;

  const speedRatio = Math.max(0, Math.min(1, 1 - (safeResponseMs / safeDurationMs)));
  const calculated = Math.round(SCORING.MIN_CORRECT_SCORE + (SCORING.MAX_CORRECT_SCORE - SCORING.MIN_CORRECT_SCORE) * speedRatio);

  return Math.max(SCORING.MIN_CORRECT_SCORE, Math.min(SCORING.MAX_CORRECT_SCORE, calculated));
}

/**
 * Sorts players according to leaderboard rules, updates rank, previousRank, and rankDelta.
 *
 * Before calling this function, callers should set player.previousRank = player.rank
 * on each player object so that rank movement can be calculated.
 *
 * Tie-breaking rules:
 *  1. Higher total score (descending)
 *  2. Lower cumulative response time (ascending)
 *  3. Earlier join time (ascending)
 * 
 * Output per player includes:
 *  rank         — new rank after sorting (1-based)
 *  previousRank — rank before this sort (may be undefined on first sort)
 *  rankDelta    — previousRank - rank (positive = moved up, negative = dropped, 0 = unchanged)
 * 
 * @param {Array<Object>} players 
 * @returns {Array<Object>} sorted players array with rank, previousRank, rankDelta
 */
function sortLeaderboard(players) {
  if (!Array.isArray(players)) return [];

  const copy = [...players];
  copy.sort((a, b) => {
    // 1. Total score descending
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    // 2. Cumulative response time ascending
    const timeDiff = (a.totalResponseTimeMs || 0) - (b.totalResponseTimeMs || 0);
    if (timeDiff !== 0) return timeDiff;

    // 3. Join time ascending
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });

  return copy.map((player, index) => {
    const newRank = index + 1;
    const previousRank = typeof player.previousRank === 'number' ? player.previousRank : newRank;
    const rankDelta = previousRank - newRank; // positive = moved up
    return {
      ...player,
      rank: newRank,
      previousRank,
      rankDelta
    };
  });
}

/**
 * Selects top N players from a sorted leaderboard for presentation display.
 * @param {Array<Object>} players - already sorted
 * @param {number} n - number of entries (default 10)
 * @returns {Array<Object>}
 */
function getTopN(players, n = 10) {
  if (!Array.isArray(players)) return [];
  return players.slice(0, n);
}

module.exports = {
  calculateScore,
  sortLeaderboard,
  getTopN
};
