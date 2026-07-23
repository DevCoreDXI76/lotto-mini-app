import { describe, expect, it } from 'vitest';
import { computeDrawInsight } from './drawInsights';
import type { LottoDraw } from './types';

const draw1231: LottoDraw = {
  drawNumber: 1231,
  date: '2026-07-04',
  numbers: [4, 13, 14, 18, 31, 38],
  bonusNumber: 15,
};

const draw1230: LottoDraw = {
  drawNumber: 1230,
  date: '2026-06-27',
  numbers: [3, 8, 9, 22, 30, 45],
  bonusNumber: 1,
};

describe('computeDrawInsight', () => {
  it('counts odd and even numbers', () => {
    const insight = computeDrawInsight(draw1231, undefined);
    expect(insight.oddCount).toBe(2); // 13, 31
    expect(insight.evenCount).toBe(4); // 4, 14, 18, 38
  });

  it('computes sum and average', () => {
    const insight = computeDrawInsight(draw1231, undefined);
    expect(insight.sum).toBe(4 + 13 + 14 + 18 + 31 + 38);
    expect(insight.average).toBeCloseTo(118 / 6, 5);
  });

  it('returns null diff when there is no previous draw', () => {
    const insight = computeDrawInsight(draw1231, undefined);
    expect(insight.sumDiffFromPrevious).toBeNull();
  });

  it('computes sum diff against the previous draw', () => {
    const insight = computeDrawInsight(draw1231, draw1230);
    const sum1231 = 4 + 13 + 14 + 18 + 31 + 38;
    const sum1230 = 3 + 8 + 9 + 22 + 30 + 45;
    expect(insight.sumDiffFromPrevious).toBe(sum1231 - sum1230);
  });
});
