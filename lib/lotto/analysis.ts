import { ALL_NUMBERS, baseWeights } from './weights';
import { frequencyProfileWeights, eliteProfileWeights, randomProfileWeights, coldProfilePool } from './profiles';
import type { LottoDraw } from './types';

export interface NumberActivity {
  number: number;
  score: number;
}

export function computeActivity(weights: Map<number, number>): NumberActivity[] {
  const values = [...weights.values()];
  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const range = max - min || 1;

  return ALL_NUMBERS.map((n) => ({
    number: n,
    score: weights.has(n) ? (weights.get(n)! - min) / range : 0,
  }));
}

function latestDraw(history: LottoDraw[]): LottoDraw | undefined {
  return [...history].sort((a, b) => b.drawNumber - a.drawNumber)[0];
}

export function getFeatureTags(history: LottoDraw[], number: number): string[] {
  const latest = latestDraw(history);
  const tags: string[] = [];
  if (!latest) return ['구간 균등 분포 후보'];

  if (latest.numbers.includes(number)) {
    tags.push('이월수 (직전 회차 재출현)');
  }

  let nearestBase: number | null = null;
  let nearestDist = Infinity;
  for (const base of latest.numbers) {
    const dist = Math.abs(base - number);
    if (dist > 0 && dist <= 2 && dist < nearestDist) {
      nearestDist = dist;
      nearestBase = base;
    }
  }
  if (nearestBase !== null) {
    tags.push(`직전 ${nearestBase}번의 ±${nearestDist} 근접수`);
  }

  const sameDigitBase = latest.numbers.find((base) => base !== number && base % 10 === number % 10);
  if (sameDigitBase !== undefined) {
    tags.push(`직전 ${sameDigitBase}번과 끝수 ${number % 10} 동일 (동끝수)`);
  }

  const recent = [...history].sort((a, b) => b.drawNumber - a.drawNumber).slice(0, 24);
  const recentCount = recent.filter((draw) => draw.numbers.includes(number)).length;
  if (recentCount >= 2 && recentCount <= 4) {
    tags.push(`최근 24회 빈도 ${recentCount}회`);
  }

  if (tags.length === 0) {
    tags.push('구간 균등 분포 후보');
  }

  return tags.slice(0, 2);
}

function topN(weights: Map<number, number>, n: number): number[] {
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([num]) => num);
}

export function getPrimaryCandidates(history: LottoDraw[], excluded: number[]): number[] {
  return topN(frequencyProfileWeights(history, excluded), 12);
}

export function getSpreadCandidates(history: LottoDraw[], excluded: number[]): number[] {
  const rankMaps = [
    frequencyProfileWeights(history, excluded),
    eliteProfileWeights(history, excluded),
    baseWeights(excluded),
    coldProfilePool(history, excluded),
  ];

  const rankScore = new Map<number, number>();
  for (const weights of rankMaps) {
    const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]);
    ranked.forEach(([num], index) => {
      rankScore.set(num, (rankScore.get(num) ?? 0) + (ranked.length - index));
    });
  }

  return topN(rankScore, 12);
}

export function getFinalCandidates(
  history: LottoDraw[],
  excluded: number[],
): { number: number; tags: string[] }[] {
  const spread = getSpreadCandidates(history, excluded);
  const weights = randomProfileWeights(history, excluded);

  return spread
    .map((number) => ({ number, weight: weights.get(number) ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map(({ number }) => ({ number, tags: getFeatureTags(history, number) }));
}
