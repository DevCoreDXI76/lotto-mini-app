import { describe, it, expect } from 'vitest';
import { calcBudgetInfo, BUDGET_PRESETS, ONLINE_LIMIT_WON, OFFLINE_LIMIT_WON } from './budget';

describe('calcBudgetInfo', () => {
  it('converts a round amount into game count at 1000 won per game', () => {
    expect(calcBudgetInfo(5000)).toEqual({
      gameCount: 5,
      actualSpentWon: 5000,
      exceedsOnlineLimit: false,
      clamped: false,
    });
  });

  it('floors non-1000 multiples and reports the actual spend', () => {
    const info = calcBudgetInfo(4500);
    expect(info.gameCount).toBe(4);
    expect(info.actualSpentWon).toBe(4000);
  });

  it('flags amounts over the 5000 won online limit', () => {
    expect(calcBudgetInfo(1000).exceedsOnlineLimit).toBe(false);
    expect(calcBudgetInfo(6000).exceedsOnlineLimit).toBe(true);
  });

  it('clamps to the 200,000 won offline hard cap', () => {
    const info = calcBudgetInfo(500000);
    expect(info.gameCount).toBe(200);
    expect(info.actualSpentWon).toBe(OFFLINE_LIMIT_WON);
    expect(info.clamped).toBe(true);
  });

  it('exposes the required presets', () => {
    expect(BUDGET_PRESETS).toEqual([1000, 5000, 10000, 20000, 50000]);
    expect(ONLINE_LIMIT_WON).toBe(5000);
  });
});
