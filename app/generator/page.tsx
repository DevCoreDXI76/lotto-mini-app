'use client';

import { useMemo, useState } from 'react';
import { STRATEGIES, type Strategy, type GeneratedGame } from '@/lib/lotto/types';
import { generateUniqueGames } from '@/lib/lotto/generate';
import { loadHistory } from '@/lib/lotto/history';
import { calcBudgetInfo, ONLINE_LIMIT_WON } from '@/lib/lotto/budget';
import { GameResultCard } from '@/components/lotto/GameResultCard';
import { Disclaimer } from '@/components/lotto/Disclaimer';
import { LatestDraw } from '@/components/lotto/LatestDraw';
import { BudgetPicker } from '@/components/lotto/BudgetPicker';

export default function GeneratorPage() {
  const history = useMemo(() => loadHistory(), []);
  const [strategy, setStrategy] = useState<Strategy>('random');
  const [count, setCount] = useState(1);
  const [excludedInput, setExcludedInput] = useState('');
  const [games, setGames] = useState<GeneratedGame[]>([]);
  const [mode, setMode] = useState<'count' | 'budget'>('count');
  const [amount, setAmount] = useState(5000);
  const budgetInfo = calcBudgetInfo(amount);
  const [collapsed, setCollapsed] = useState(true);

  const excluded = excludedInput
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);

  function handleGenerate() {
    const gameCount = mode === 'budget' ? budgetInfo.gameCount : count;
    setGames(generateUniqueGames(strategy, gameCount, excluded, history));
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
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMode('count')}
            className={`flex-1 py-2 rounded-lg border text-sm ${mode === 'count' ? 'bg-black text-white' : 'bg-white'}`}
          >
            세트 수로 선택
          </button>
          <button
            type="button"
            onClick={() => setMode('budget')}
            className={`flex-1 py-2 rounded-lg border text-sm ${mode === 'budget' ? 'bg-black text-white' : 'bg-white'}`}
          >
            예산으로 선택
          </button>
        </div>

        {mode === 'count' ? (
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
        ) : (
          <div className="space-y-2">
            <h2 className="font-semibold">구매 예정 금액</h2>
            <BudgetPicker amount={amount} onChange={setAmount} />
            <p className="text-sm text-gray-600">
              총 {budgetInfo.actualSpentWon.toLocaleString()}원 · {budgetInfo.gameCount}게임
              {amount !== budgetInfo.actualSpentWon && !budgetInfo.clamped && (
                <span className="text-gray-400"> (1,000원 단위로 절사됨)</span>
              )}
            </p>
            {budgetInfo.clamped && (
              <p className="text-sm text-red-500">
                1회 구매 상한(200,000원/200게임)을 초과해 200게임으로 제한됩니다.
              </p>
            )}
            {budgetInfo.exceedsOnlineLimit && (
              <p className="text-sm text-amber-600">
                온라인으로 직접 구매 시 1회 한도는 {ONLINE_LIMIT_WON.toLocaleString()}원입니다.
              </p>
            )}
          </div>
        )}
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
          {mode === 'budget' && (
            <p className="text-sm font-semibold">
              총 {budgetInfo.actualSpentWon.toLocaleString()}원 · {games.length}게임
            </p>
          )}
          {(collapsed && games.length > 20 ? games.slice(0, 20) : games).map((g, i) => (
            <GameResultCard key={g.numbers.join(',')} game={g} index={i} />
          ))}
          {games.length > 20 && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="w-full text-sm text-gray-500 py-2"
            >
              {collapsed ? `${games.length - 20}게임 더 보기` : '접기'}
            </button>
          )}
          <Disclaimer />
        </div>
      )}
    </main>
  );
}
