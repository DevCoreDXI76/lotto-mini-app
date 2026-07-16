import type { LottoDraw } from './types';

export const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

export function baseWeights(excluded: number[]): Map<number, number> {
  const excludedSet = new Set(excluded);
  const weights = new Map<number, number>();
  for (const n of ALL_NUMBERS) {
    if (!excludedSet.has(n)) weights.set(n, 1);
  }
  return weights;
}

function latestDraw(history: LottoDraw[]): LottoDraw | undefined {
  return [...history].sort((a, b) => b.drawNumber - a.drawNumber)[0];
}

export function countOccurrences(history: LottoDraw[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const n of ALL_NUMBERS) counts.set(n, 0);
  for (const draw of history) {
    for (const n of draw.numbers) {
      if (counts.has(n)) counts.set(n, counts.get(n)! + 1);
    }
  }
  return counts;
}

export function frequencyWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const counts = countOccurrences(history);
  for (const [n, w] of weights) {
    weights.set(n, w + counts.get(n)!);
  }
  return weights;
}

export function carryoverWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = latestDraw(history);
  if (latest) {
    for (const n of latest.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 5);
    }
  }
  return weights;
}

export function coldWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
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

export function neighborWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = latestDraw(history);
  if (latest) {
    for (const base of latest.numbers) {
      for (const delta of [-2, -1, 1, 2]) {
        const n = base + delta;
        if (weights.has(n)) weights.set(n, weights.get(n)! + 2);
      }
    }
  }
  return weights;
}

export function sameLastDigitWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = latestDraw(history);
  if (latest) {
    const digits = new Set(latest.numbers.map((n) => n % 10));
    for (const n of ALL_NUMBERS) {
      if (weights.has(n) && digits.has(n % 10)) {
        weights.set(n, weights.get(n)! + 3);
      }
    }
  }
  return weights;
}

export function mergeWeights(sources: [Map<number, number>, number][]): Map<number, number> {
  const merged = new Map<number, number>();
  for (const [weights, multiplier] of sources) {
    for (const [num, w] of weights) {
      merged.set(num, (merged.get(num) ?? 0) + w * multiplier);
    }
  }
  return merged;
}

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
