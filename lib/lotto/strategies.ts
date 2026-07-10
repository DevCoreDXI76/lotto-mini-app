import type { LottoDraw, Strategy } from './types';

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

export function pickWeighted(
  weights: Map<number, number>,
  count: number,
  rng: () => number = Math.random,
): number[] {
  const pool = new Map(weights);
  const picked: number[] = [];

  while (picked.length < count && pool.size > 0) {
    const total = [...pool.values()].reduce((sum, w) => sum + w, 0);
    let threshold = rng() * total;
    let chosen: number | null = null;

    for (const [num, w] of pool) {
      threshold -= w;
      if (threshold <= 0) {
        chosen = num;
        break;
      }
    }

    if (chosen === null) chosen = [...pool.keys()][pool.size - 1];
    picked.push(chosen);
    pool.delete(chosen);
  }

  return picked;
}

function baseWeights(excluded: number[]): Map<number, number> {
  const excludedSet = new Set(excluded);
  const weights = new Map<number, number>();
  for (const n of ALL_NUMBERS) {
    if (!excludedSet.has(n)) weights.set(n, 1);
  }
  return weights;
}

function frequencyWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  for (const draw of history) {
    for (const n of draw.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 1);
    }
  }
  return weights;
}

function carryoverWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = [...history].sort((a, b) => b.drawNumber - a.drawNumber)[0];
  if (latest) {
    for (const n of latest.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 5);
    }
  }
  return weights;
}

function coldWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const sorted = [...history].sort((a, b) => b.drawNumber - a.drawNumber);
  const lastSeenGap = new Map<number, number>();

  for (const n of ALL_NUMBERS) lastSeenGap.set(n, sorted.length);
  sorted.forEach((draw, gap) => {
    for (const n of draw.numbers) {
      if (lastSeenGap.get(n) === sorted.length) lastSeenGap.set(n, gap);
    }
  });

  for (const [n, gap] of lastSeenGap) {
    if (weights.has(n)) weights.set(n, weights.get(n)! + gap);
  }
  return weights;
}

function balancedPick(excluded: number[], rng: () => number): number[] {
  const excludedSet = new Set(excluded);
  const pool = ALL_NUMBERS.filter((n) => !excludedSet.has(n));

  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidate = shuffled.slice(0, 6);
    if (candidate.length < 6) return candidate;

    const oddCount = candidate.filter((n) => n % 2 === 1).length;
    const lowCount = candidate.filter((n) => n <= 22).length;

    if (oddCount >= 2 && oddCount <= 4 && lowCount >= 2 && lowCount <= 4) {
      return candidate;
    }
  }

  return pool.slice(0, 6);
}

export function generateByStrategy(
  strategy: Strategy,
  history: LottoDraw[],
  excluded: number[],
  rng: () => number = Math.random,
): number[] {
  switch (strategy) {
    case 'frequency':
      return pickWeighted(frequencyWeights(history, excluded), 6, rng);
    case 'carryover':
      return pickWeighted(carryoverWeights(history, excluded), 6, rng);
    case 'cold':
      return pickWeighted(coldWeights(history, excluded), 6, rng);
    case 'balanced':
      return balancedPick(excluded, rng);
    case 'random':
    default:
      return pickWeighted(baseWeights(excluded), 6, rng);
  }
}
