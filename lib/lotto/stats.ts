import { ALL_NUMBERS } from './weights';
import type { LottoDraw } from './types';

export interface FrequencyRankEntry {
  number: number;
  count: number;
  rank: number;
}

export function computeFrequencyRanking(history: LottoDraw[]): FrequencyRankEntry[] {
  const counts = new Map<number, number>();
  for (const n of ALL_NUMBERS) counts.set(n, 0);

  for (const draw of history) {
    for (const n of draw.numbers) {
      if (counts.has(n)) counts.set(n, counts.get(n)! + 1);
    }
  }

  const sorted = ALL_NUMBERS.map((number) => ({ number, count: counts.get(number)! })).sort(
    (a, b) => b.count - a.count || a.number - b.number,
  );

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
