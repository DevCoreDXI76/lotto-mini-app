import { describe, it, expect } from 'vitest';
import {
  computeActivity,
  getFeatureTags,
  getPrimaryCandidates,
  getSpreadCandidates,
  getFinalCandidates,
} from './analysis';
import type { LottoDraw } from './types';

const history: LottoDraw[] = Array.from({ length: 24 }, (_, i) => ({
  drawNumber: 24 - i,
  date: `2025-01-${String(i + 1).padStart(2, '0')}`,
  numbers: i === 0 ? [10, 20, 30, 40, 5, 15] : [1, 2, 3, i % 6 === 0 ? 12 : 44, 43, 42],
  bonusNumber: 7,
})) as LottoDraw[];

describe('computeActivity', () => {
  it('normalizes weights into a 0..1 score for all 45 numbers', () => {
    const weights = new Map([[1, 10], [2, 5]]);
    const activity = computeActivity(weights);
    expect(activity).toHaveLength(45);
    const one = activity.find((a) => a.number === 1)!;
    const two = activity.find((a) => a.number === 2)!;
    expect(one.score).toBeGreaterThan(two.score);
    for (const a of activity) {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(1);
    }
  });
});

describe('getFeatureTags', () => {
  it('tags a number that appeared in the latest draw as carryover', () => {
    const tags = getFeatureTags(history, 10);
    expect(tags).toContain('이월수 (직전 회차 재출현)');
  });

  it('falls back to a neutral tag when nothing else applies', () => {
    const tags = getFeatureTags(history, 33);
    expect(tags.length).toBeGreaterThan(0);
  });
});

describe('candidate pools', () => {
  it('primary and spread candidates return 12 unique numbers each', () => {
    const primary = getPrimaryCandidates(history, []);
    const spread = getSpreadCandidates(history, []);
    expect(new Set(primary).size).toBe(12);
    expect(new Set(spread).size).toBe(12);
  });

  it('final candidates return 8 numbers each with at least one feature tag', () => {
    const final = getFinalCandidates(history, []);
    expect(final).toHaveLength(8);
    for (const c of final) {
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });
});
