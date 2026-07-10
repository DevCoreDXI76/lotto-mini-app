import { describe, it, expect } from 'vitest';
import { PROFILE_PICKERS, getProfileWeights } from './profiles';
import type { LottoDraw, Strategy } from './types';

const history: LottoDraw[] = [
  { drawNumber: 2, date: '2025-12-01', numbers: [10, 20, 30, 40, 5, 15], bonusNumber: 25 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
];

describe('PROFILE_PICKERS', () => {
  const strategies: Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];

  it('each profile picker returns the requested count of unique, non-excluded numbers', () => {
    for (const strategy of strategies) {
      const picked = PROFILE_PICKERS[strategy](history, [1, 2, 3], 6, [], Math.random);
      expect(picked).toHaveLength(6);
      expect(new Set(picked).size).toBe(6);
      for (const n of picked) {
        expect([1, 2, 3]).not.toContain(n);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
    }
  });

  it('respects a smaller remainingCount when numbers are already included', () => {
    const picked = PROFILE_PICKERS.frequency(history, [], 2, [7, 8, 9], Math.random);
    expect(picked).toHaveLength(2);
    expect(picked).not.toContain(7);
  });
});

describe('getProfileWeights', () => {
  it('never includes excluded numbers, for every strategy', () => {
    const strategies: Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];
    for (const strategy of strategies) {
      const weights = getProfileWeights(strategy, history, [1]);
      expect(weights.has(1)).toBe(false);
    }
  });

  it('non-cold strategies cover most of the 45 numbers, cold restricts to a top-25 pool', () => {
    expect(getProfileWeights('frequency', history, []).size).toBe(45);
    expect(getProfileWeights('cold', history, []).size).toBeLessThanOrEqual(25);
  });
});
