import { generateByStrategy } from './strategies';
import type { GeneratedGame, LottoDraw, Strategy } from './types';

export function generateUniqueGames(
  strategy: Strategy,
  gameCount: number,
  excluded: number[],
  history: LottoDraw[],
  rng: () => number = Math.random,
): GeneratedGame[] {
  const seen = new Set<string>();
  const games: GeneratedGame[] = [];
  const maxAttempts = gameCount * 50 + 100;

  for (let attempt = 0; attempt < maxAttempts && games.length < gameCount; attempt++) {
    const raw = generateByStrategy(strategy, history, excluded, rng);
    if (raw.length < 6) break;

    const numbers = [...raw].sort((a, b) => a - b);
    const key = numbers.join(',');
    if (seen.has(key)) continue;

    seen.add(key);
    games.push({ numbers });
  }

  return games;
}
