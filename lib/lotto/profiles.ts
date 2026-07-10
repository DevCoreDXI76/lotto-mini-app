import {
  ALL_NUMBERS,
  baseWeights,
  frequencyWeights,
  carryoverWeights,
  coldWeights,
  neighborWeights,
  sameLastDigitWeights,
  mergeWeights,
  pickWeighted,
} from './weights';
import type { LottoDraw, Strategy } from './types';

export type ProfilePicker = (
  history: LottoDraw[],
  poolExcluded: number[],
  remainingCount: number,
  included: number[],
  rng: () => number,
) => number[];

export function frequencyProfileWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  return mergeWeights([
    [frequencyWeights(history, excluded), 1],
    [carryoverWeights(history, excluded), 1],
    [neighborWeights(history, excluded), 1],
    [sameLastDigitWeights(history, excluded), 1],
  ]);
}

export function eliteProfileWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  return mergeWeights([
    [frequencyWeights(history, excluded), 3],
    [carryoverWeights(history, excluded), 3],
    [coldWeights(history, excluded), 2],
  ]);
}

export function randomProfileWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  return mergeWeights([
    [frequencyWeights(history, excluded), 1],
    [carryoverWeights(history, excluded), 1],
    [coldWeights(history, excluded), 1],
    [neighborWeights(history, excluded), 1],
    [sameLastDigitWeights(history, excluded), 1],
  ]);
}

export function coldProfilePool(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = coldWeights(history, excluded);
  const top25 = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  return new Map(top25);
}

function balancedPicker(
  _history: LottoDraw[],
  poolExcluded: number[],
  remainingCount: number,
  included: number[],
  rng: () => number,
): number[] {
  const excludedSet = new Set(poolExcluded);
  const pool = ALL_NUMBERS.filter((n) => !excludedSet.has(n));

  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidate = shuffled.slice(0, remainingCount);
    if (candidate.length < remainingCount) return candidate;

    const merged = [...included, ...candidate];
    const oddCount = merged.filter((n) => n % 2 === 1).length;
    const lowCount = merged.filter((n) => n <= 22).length;

    if (oddCount >= 2 && oddCount <= 4 && lowCount >= 2 && lowCount <= 4) {
      return candidate;
    }
  }

  return pool.slice(0, remainingCount);
}

export const PROFILE_PICKERS: Record<Strategy, ProfilePicker> = {
  frequency: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(frequencyProfileWeights(history, poolExcluded), remainingCount, rng),
  elite: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(eliteProfileWeights(history, poolExcluded), remainingCount, rng),
  balanced: balancedPicker,
  cold: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(coldProfilePool(history, poolExcluded), remainingCount, rng),
  random: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(randomProfileWeights(history, poolExcluded), remainingCount, rng),
};

export function getProfileWeights(strategy: Strategy, history: LottoDraw[], excluded: number[]): Map<number, number> {
  switch (strategy) {
    case 'frequency':
      return frequencyProfileWeights(history, excluded);
    case 'elite':
      return eliteProfileWeights(history, excluded);
    case 'balanced':
      return baseWeights(excluded);
    case 'cold':
      return coldProfilePool(history, excluded);
    case 'random':
      return randomProfileWeights(history, excluded);
  }
}
