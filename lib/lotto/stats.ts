import { ALL_NUMBERS, countOccurrences } from './weights';
import type { LottoDraw } from './types';

export interface FrequencyRankEntry {
  number: number;
  count: number;
  rank: number;
}

export function computeFrequencyRanking(history: LottoDraw[]): FrequencyRankEntry[] {
  const counts = countOccurrences(history);

  const sorted = ALL_NUMBERS.map((number) => ({ number, count: counts.get(number)! })).sort(
    (a, b) => b.count - a.count || a.number - b.number,
  );

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
