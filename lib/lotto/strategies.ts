import { PROFILE_PICKERS } from './profiles';
import type { LottoDraw, Strategy } from './types';

export function normalizeIncluded(included: number[], excluded: number[]): number[] {
  const excludedSet = new Set(excluded);
  const seen = new Set<number>();
  const result: number[] = [];

  for (const n of included) {
    if (Number.isInteger(n) && n >= 1 && n <= 45 && !excludedSet.has(n) && !seen.has(n)) {
      seen.add(n);
      result.push(n);
      if (result.length >= 5) break;
    }
  }

  return result;
}

export function generateByStrategy(
  strategy: Strategy,
  history: LottoDraw[],
  excluded: number[],
  rng: () => number = Math.random,
  included: number[] = [],
): number[] {
  const validIncluded = normalizeIncluded(included, excluded);
  const poolExcluded = [...new Set([...excluded, ...validIncluded])];
  const remainingCount = 6 - validIncluded.length;

  if (remainingCount <= 0) {
    return [...validIncluded].sort((a, b) => a - b).slice(0, 6);
  }

  const picked = PROFILE_PICKERS[strategy](history, poolExcluded, remainingCount, validIncluded, rng);
  return [...validIncluded, ...picked].sort((a, b) => a - b);
}
