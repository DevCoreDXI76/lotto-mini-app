'use client';

import { useState } from 'react';
import { NumberBall } from './NumberBall';
import type { GeneratedGame } from '@/lib/lotto/types';

export function GameResultCard({
  game,
  index,
  showStats = false,
}: {
  game: GeneratedGame;
  index: number;
  showStats?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(game.numbers.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const sum = game.numbers.reduce((a, b) => a + b, 0);
  const oddCount = game.numbers.filter((n) => n % 2 === 1).length;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl p-3 bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-6 shrink-0">{index + 1}</span>
        <div className="flex gap-1">
          {game.numbers.map((n) => (
            <NumberBall key={n} n={n} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3">
        {showStats && (
          <span className="text-xs text-gray-400">
            합 {sum} · 홀{oddCount}짝{6 - oddCount}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 whitespace-nowrap shrink-0"
          type="button"
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}
