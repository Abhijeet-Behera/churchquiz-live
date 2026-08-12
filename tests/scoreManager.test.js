import { describe, it, expect } from 'vitest';
const { calculateScore, sortLeaderboard } = require('../server/scoreManager');

describe('scoreManager', () => {
  it('wrong answer gives zero points', () => {
    expect(calculateScore(false, 1000, 15000)).toBe(0);
    expect(calculateScore(false, 0, 15000)).toBe(0);
  });

  it('immediate correct answer gives approximately 1000 points', () => {
    const score = calculateScore(true, 0, 15000);
    expect(score).toBe(1000);
  });

  it('correct answer at the deadline gives approximately 500 points', () => {
    const score = calculateScore(true, 15000, 15000);
    expect(score).toBe(500);
  });

  it('scores never exceed 1000', () => {
    const score = calculateScore(true, -500, 15000);
    expect(score).toBeLessThanOrEqual(1000);
  });

  it('scores never fall below 500 for correct answers', () => {
    const score = calculateScore(true, 20000, 15000);
    expect(score).toBeGreaterThanOrEqual(500);
  });

  it('handles invalid timing values safely', () => {
    expect(calculateScore(true, null, undefined)).toBeGreaterThanOrEqual(500);
    expect(calculateScore(true, 'fast', 'fifteen')).toBeGreaterThanOrEqual(500);
  });

  it('sorts leaderboard correctly with tie-breaking rules', () => {
    const players = [
      { id: 'p1', name: 'Alice', score: 800, totalResponseTimeMs: 4000, joinedAt: 100 },
      { id: 'p2', name: 'Bob', score: 1000, totalResponseTimeMs: 3000, joinedAt: 200 },
      { id: 'p3', name: 'Charlie', score: 800, totalResponseTimeMs: 2000, joinedAt: 300 },
      { id: 'p4', name: 'David', score: 800, totalResponseTimeMs: 2000, joinedAt: 50 }
    ];

    const sorted = sortLeaderboard(players);

    // 1st: Bob (score 1000)
    expect(sorted[0].id).toBe('p2');
    expect(sorted[0].rank).toBe(1);

    // 2nd: David (score 800, totalResponseTime 2000, joinedAt 50)
    expect(sorted[1].id).toBe('p4');
    expect(sorted[1].rank).toBe(2);

    // 3rd: Charlie (score 800, totalResponseTime 2000, joinedAt 300)
    expect(sorted[2].id).toBe('p3');
    expect(sorted[2].rank).toBe(3);

    // 4th: Alice (score 800, totalResponseTime 4000)
    expect(sorted[3].id).toBe('p1');
    expect(sorted[3].rank).toBe(4);
  });
});
