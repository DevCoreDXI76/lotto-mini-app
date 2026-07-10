import { describe, it, expect } from 'vitest';
import { generateByStrategy } from './strategies';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 3, date: '2026-01-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
  { drawNumber: 2, date: '2025-12-01', numbers: [1, 2, 3, 10, 11, 12], bonusNumber: 13 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 40, 41, 42, 43, 44], bonusNumber: 45 },
];

describe('generateByStrategy', () => {
  it('returns 6 unique numbers between 1 and 45 for every strategy', () => {
    const strategies = ['frequency', 'carryover', 'balanced', 'cold', 'random'] as const;
    for (const strategy of strategies) {
      const result = generateByStrategy(strategy, history, [], () => 0.5);
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      for (const n of result) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
    }
  });

  it('never returns excluded numbers', () => {
    const excluded = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = generateByStrategy('random', history, excluded, Math.random);
    for (const n of result) {
      expect(excluded).not.toContain(n);
    }
  });

  it('frequency strategy favors numbers with higher historical frequency over many trials', () => {
    let countOf1 = 0;
    let countOf20 = 0;
    for (let i = 0; i < 200; i++) {
      const result = generateByStrategy('frequency', history, [], Math.random);
      if (result.includes(1)) countOf1++;
      if (result.includes(20)) countOf20++;
    }
    // 1 appears in all 3 historical draws, 20 appears in none
    expect(countOf1).toBeGreaterThan(countOf20);
  });
});
