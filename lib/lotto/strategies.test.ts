import { describe, it, expect } from 'vitest';
import { generateByStrategy, normalizeIncluded } from './strategies';
import type { LottoDraw, Strategy } from './types';

const history: LottoDraw[] = [
  { drawNumber: 3, date: '2026-01-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
  { drawNumber: 2, date: '2025-12-01', numbers: [1, 2, 3, 10, 11, 12], bonusNumber: 13 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 40, 41, 42, 43, 44], bonusNumber: 45 },
];

describe('generateByStrategy', () => {
  it('returns 6 unique numbers between 1 and 45 for every strategy', () => {
    const strategies: Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];
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

  it('always includes the provided included numbers', () => {
    const included = [20, 21, 22];
    const result = generateByStrategy('elite', history, [], Math.random, included);
    for (const n of included) {
      expect(result).toContain(n);
    }
    expect(result).toHaveLength(6);
  });
});

describe('normalizeIncluded', () => {
  it('deduplicates, validates range, and caps at 5 numbers', () => {
    const result = normalizeIncluded([1, 1, 2, 3, 4, 5, 6, 0, 46], []);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('drops numbers that are also excluded', () => {
    const result = normalizeIncluded([1, 2, 3], [2]);
    expect(result).toEqual([1, 3]);
  });
});
