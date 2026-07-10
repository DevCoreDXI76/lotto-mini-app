'use client';

import { useState } from 'react';
import { NumberBall } from './NumberBall';
import type { GeneratedGame } from '@/lib/lotto/types';

export function GameResultCard({ game, index }: { game: GeneratedGame; index: number }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(game.numbers.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-6">{index + 1}</span>
        <div className="flex gap-1">
          {game.numbers.map((n) => (
            <NumberBall key={n} n={n} />
          ))}
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
        type="button"
      >
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}
