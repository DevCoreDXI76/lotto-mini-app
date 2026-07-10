'use client';

import { useMemo, useState } from 'react';
import { STRATEGIES, type Strategy, type GeneratedGame } from '@/lib/lotto/types';
import { generateUniqueGames } from '@/lib/lotto/generate';
import { loadHistory } from '@/lib/lotto/history';
import { GameResultCard } from '@/components/lotto/GameResultCard';
import { Disclaimer } from '@/components/lotto/Disclaimer';
import { LatestDraw } from '@/components/lotto/LatestDraw';

export default function GeneratorPage() {
  const history = useMemo(() => loadHistory(), []);
  const [strategy, setStrategy] = useState<Strategy>('random');
  const [count, setCount] = useState(1);
  const [excludedInput, setExcludedInput] = useState('');
  const [games, setGames] = useState<GeneratedGame[]>([]);

  const excluded = excludedInput
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);

  function handleGenerate() {
    setGames(generateUniqueGames(strategy, count, excluded, history));
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">번호 생성기</h1>
      <LatestDraw />

      <div>
        <h2 className="font-semibold mb-2">전략 선택</h2>
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStrategy(s.id)}
              className={`px-3 py-1.5 rounded-full border text-sm ${
                strategy === s.id ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">생성 세트 수: {count}</h2>
        <input
          type="range"
          min={1}
          max={5}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <h2 className="font-semibold mb-2">제외 번호 (쉼표로 구분, 예: 3, 17, 45)</h2>
        <input
          type="text"
          value={excludedInput}
          onChange={(e) => setExcludedInput(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="예: 3, 17, 45"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        className="w-full bg-black text-white rounded-lg py-3 font-semibold"
      >
        번호 생성하기
      </button>

      {games.length > 0 && (
        <div className="space-y-2">
          {games.map((g, i) => (
            <GameResultCard key={g.numbers.join(',')} game={g} index={i} />
          ))}
          <Disclaimer />
        </div>
      )}
    </main>
  );
}
