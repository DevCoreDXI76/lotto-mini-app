export const BUDGET_PRESETS = [1000, 5000, 10000, 20000, 50000];
export const ONLINE_LIMIT_WON = 5000;
export const OFFLINE_LIMIT_WON = 200000;
const WON_PER_GAME = 1000;

export interface BudgetInfo {
  gameCount: number;
  actualSpentWon: number;
  exceedsOnlineLimit: boolean;
  clamped: boolean;
}

export function calcBudgetInfo(amountWon: number): BudgetInfo {
  const clamped = amountWon > OFFLINE_LIMIT_WON;
  const effectiveAmount = clamped ? OFFLINE_LIMIT_WON : Math.max(0, amountWon);
  const gameCount = Math.floor(effectiveAmount / WON_PER_GAME);

  return {
    gameCount,
    actualSpentWon: gameCount * WON_PER_GAME,
    exceedsOnlineLimit: amountWon > ONLINE_LIMIT_WON,
    clamped,
  };
}
