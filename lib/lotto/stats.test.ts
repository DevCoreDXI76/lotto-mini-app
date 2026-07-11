import { describe, it, expect } from 'vitest';
import { computeFrequencyRanking } from './stats';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 2, date: '2025-12-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 2, 3, 10, 11, 12], bonusNumber: 13 },
];

describe('computeFrequencyRanking', () => {
  it('counts occurrences per number correctly', () => {
    const ranking = computeFrequencyRanking(history);
    const one = ranking.find((r) => r.number === 1)!;
    const four = ranking.find((r) => r.number === 4)!;
    const forty = ranking.find((r) => r.number === 40)!;
    expect(one.count).toBe(2);
    expect(four.count).toBe(1);
    expect(forty.count).toBe(0);
  });

  it('returns all 45 numbers including those with zero occurrences', () => {
    const ranking = computeFrequencyRanking(history);
    expect(ranking).toHaveLength(45);
    expect(new Set(ranking.map((r) => r.number)).size).toBe(45);
  });

  it('sorts by count descending, tie-broken by number ascending', () => {
    const ranking = computeFrequencyRanking(history);
    for (let i = 1; i < ranking.length; i++) {
      const prev = ranking[i - 1];
      const curr = ranking[i];
      const orderedByCount = prev.count > curr.count;
      const tiedAndOrderedByNumber = prev.count === curr.count && prev.number < curr.number;
      expect(orderedByCount || tiedAndOrderedByNumber).toBe(true);
    }
  });

  it('assigns sequential ranks from 1 to 45', () => {
    const ranking = computeFrequencyRanking(history);
    expect(ranking.map((r) => r.rank)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });
});
