import { describe, it, expect } from 'vitest';
import { generateUniqueGames } from './generate';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 1, date: '2025-01-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
];

describe('generateUniqueGames', () => {
  it('generates the requested number of games, each sorted and unique', () => {
    const games = generateUniqueGames('random', 5, [], history, Math.random);
    expect(games).toHaveLength(5);
    const keys = games.map((g) => g.numbers.join(','));
    expect(new Set(keys).size).toBe(5);
    for (const g of games) {
      expect(g.numbers).toEqual([...g.numbers].sort((a, b) => a - b));
    }
  });

  it('caps at the maximum possible unique combinations when excluded numbers leave fewer than 6 choices', () => {
    const excluded = Array.from({ length: 40 }, (_, i) => i + 1); // leaves only 41..45 (5 numbers)
    const games = generateUniqueGames('random', 3, excluded, history, Math.random);
    expect(games).toHaveLength(0);
  });

  it('every generated game contains all included numbers', () => {
    const games = generateUniqueGames('random', 3, [], history, Math.random, [9, 18, 27]);
    for (const g of games) {
      expect(g.numbers).toEqual(expect.arrayContaining([9, 18, 27]));
    }
  });
});
