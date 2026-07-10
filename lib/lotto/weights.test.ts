import { describe, it, expect } from 'vitest';
import {
  frequencyWeights,
  carryoverWeights,
  coldWeights,
  neighborWeights,
  sameLastDigitWeights,
  mergeWeights,
  pickWeighted,
} from './weights';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 2, date: '2025-12-01', numbers: [10, 20, 30, 40, 5, 15], bonusNumber: 25 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
];

describe('atomic weight sources', () => {
  it('frequencyWeights counts historical occurrences per number', () => {
    const weights = frequencyWeights(history, []);
    expect(weights.get(5)).toBe(1 + 2); // base 1 + appears in both draws
    expect(weights.get(45)).toBe(1); // never appears
  });

  it('carryoverWeights boosts only the most recent draw numbers', () => {
    const weights = carryoverWeights(history, []);
    expect(weights.get(10)).toBeGreaterThan(weights.get(1)!);
  });

  it('coldWeights gives higher weight to numbers with a larger gap since last seen', () => {
    const weights = coldWeights(history, []);
    expect(weights.get(45)).toBeGreaterThan(weights.get(10)!);
  });

  it('neighborWeights boosts numbers within +-2 of the latest draw', () => {
    const weights = neighborWeights(history, []);
    expect(weights.get(11)).toBeGreaterThan(weights.get(25)!);
  });

  it('sameLastDigitWeights boosts numbers sharing the last digit with the latest draw', () => {
    const weights = sameLastDigitWeights(history, []);
    expect(weights.get(25)).toBeGreaterThan(weights.get(26)!); // latest draw has 5, 10, 15, 20, 30, 40 (digits 0, 5)
  });

  it('mergeWeights sums weighted sources', () => {
    const a = new Map([[1, 1], [2, 1]]);
    const b = new Map([[1, 1], [2, 1]]);
    const merged = mergeWeights([[a, 3], [b, 1]]);
    expect(merged.get(1)).toBe(3 * 1 + 1 * 1);
  });

  it('pickWeighted returns the requested count of unique numbers', () => {
    const weights = new Map([[1, 10], [2, 1], [3, 1]]);
    const picked = pickWeighted(weights, 2, () => 0);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
  });
});
