import type { LottoDraw } from './types';

export interface DrawInsight {
  oddCount: number;
  evenCount: number;
  sum: number;
  average: number;
  sumDiffFromPrevious: number | null;
}

function sumOf(draw: LottoDraw): number {
  return draw.numbers.reduce((total, n) => total + n, 0);
}

export function computeDrawInsight(draw: LottoDraw, previous: LottoDraw | undefined): DrawInsight {
  const oddCount = draw.numbers.filter((n) => n % 2 === 1).length;
  const sum = sumOf(draw);

  return {
    oddCount,
    evenCount: draw.numbers.length - oddCount,
    sum,
    average: sum / draw.numbers.length,
    sumDiffFromPrevious: previous ? sum - sumOf(previous) : null,
  };
}
