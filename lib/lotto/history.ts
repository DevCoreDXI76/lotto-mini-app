import seed from '@/data/lotto-history-seed.json';
import type { LottoDraw } from './types';

export function loadHistory(): LottoDraw[] {
  const draws = seed as LottoDraw[];
  return [...draws].sort((a, b) => b.drawNumber - a.drawNumber);
}
