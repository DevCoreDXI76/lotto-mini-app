'use client';

import { useMemo, useState } from 'react';
import { STRATEGIES, type Strategy, type GeneratedGame } from '@/lib/lotto/types';
import { generateUniqueGames } from '@/lib/lotto/generate';
import { normalizeIncluded } from '@/lib/lotto/strategies';
import { loadHistory } from '@/lib/lotto/history';
import { calcBudgetInfo, ONLINE_LIMIT_WON } from '@/lib/lotto/budget';
import {
  getPrimaryCandidates,
  getSpreadCandidates,
  getFinalCandidates,
  computeActivity,
} from '@/lib/lotto/analysis';
import { getProfileWeights } from '@/lib/lotto/profiles';
import { useLatestDraw } from '@/lib/lotto/useLatestDraw';
import { GameResultCard } from '@/components/lotto/GameResultCard';
import { Disclaimer } from '@/components/lotto/Disclaimer';
import { DetailedDisclaimer } from '@/components/lotto/DetailedDisclaimer';
import { LatestDraw } from '@/components/lotto/LatestDraw';
import { BudgetPicker } from '@/components/lotto/BudgetPicker';
import { StrategyCard } from '@/components/lotto/StrategyCard';
import { IncludeNumbersInput } from '@/components/lotto/IncludeNumbersInput';
import { AlgorithmSummaryCard } from '@/components/lotto/AlgorithmSummaryCard';
import { ActivityChart } from '@/components/lotto/ActivityChart';
import { CandidatePoolList } from '@/components/lotto/CandidatePoolList';
import { FinalCandidateCard } from '@/components/lotto/FinalCandidateCard';

export default function GeneratorPage() {
  const history = useMemo(() => loadHistory(), []);
  const latest = useLatestDraw();
  const [strategy, setStrategy] = useState<Strategy>('random');
  const [count, setCount] = useState(1);
  const [excludedInput, setExcludedInput] = useState('');
  const [includedInput, setIncludedInput] = useState('');
  const [games, setGames] = useState<GeneratedGame[]>([]);
  const [mode, setMode] = useState<'count' | 'budget'>('count');
  const [amount, setAmount] = useState(5000);
  const budgetInfo = calcBudgetInfo(amount);
  const [collapsed, setCollapsed] = useState(true);

  const excluded = useMemo(
    () =>
      excludedInput
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45),
    [excludedInput],
  );

  const included = useMemo(() => {
    const includedRaw = includedInput
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
    return normalizeIncluded(includedRaw, excluded);
  }, [includedInput, excluded]);

  function handleGenerate() {
    const gameCount = mode === 'budget' ? budgetInfo.gameCount : count;
    setGames(generateUniqueGames(strategy, gameCount, excluded, history, Math.random, included));
  }

  const selectedStrategyMeta = STRATEGIES.find((s) => s.id === strategy)!;

  const activity = useMemo(
    () => computeActivity(getProfileWeights(strategy, history, excluded)),
    [strategy, history, excluded],
  );
  const primaryCandidates = useMemo(
    () => (strategy === 'random' ? getPrimaryCandidates(history, excluded) : []),
    [strategy, history, excluded],
  );
  const spreadCandidates = useMemo(
    () => (strategy === 'random' ? getSpreadCandidates(history, excluded) : []),
    [strategy, history, excluded],
  );
  const finalCandidates = useMemo(
    () => (strategy === 'random' ? getFinalCandidates(history, excluded) : []),
    [strategy, history, excluded],
  );

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">번호 생성기</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold mb-2">전략 선택</h2>
            <div className="space-y-2">
              {STRATEGIES.map((s) => (
                <StrategyCard key={s.id} strategy={s} selected={strategy === s.id} onSelect={setStrategy} />
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

          <IncludeNumbersInput value={includedInput} onChange={setIncludedInput} excluded={excluded} />

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-black text-white rounded-lg py-3 font-semibold"
          >
            번호 생성하기
          </button>
        </div>

        <div className="space-y-6">
          <LatestDraw />

          {mode === 'count' && (
            <>
              <AlgorithmSummaryCard strategy={selectedStrategyMeta} />
              <ActivityChart
                activity={activity}
                highlighted={strategy === 'random' ? finalCandidates.map((c) => c.number) : []}
              />
            </>
          )}

          {games.length > 0 && (
            <div className="space-y-2">
              {mode === 'budget' && (
                <p className="text-sm font-semibold">
                  총 {budgetInfo.actualSpentWon.toLocaleString()}원 · {games.length}게임
                </p>
              )}
              {(collapsed && games.length > 20 ? games.slice(0, 20) : games).map((g, i) => (
                <GameResultCard key={g.numbers.join(',')} game={g} index={i} showStats={mode === 'count'} />
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

          {mode === 'count' && strategy === 'random' && (
            <div className="space-y-4">
              <CandidatePoolList
                title="1차 후보군 12수"
                description="빈도 기반 전략 가중치 상위 12개"
                numbers={primaryCandidates}
              />
              <CandidatePoolList
                title="전략 확산 12수"
                description="4개 전략(빈도/엘리트/균형/Cold) 순위를 합산한 상위 12개"
                numbers={spreadCandidates}
              />
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">최종 조합 후보 8개</h3>
                <div className="space-y-2">
                  {finalCandidates.map((c) => (
                    <FinalCandidateCard key={c.number} number={c.number} tags={c.tags} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'count' && latest && (
            <DetailedDisclaimer drawNumber={latest.draw.drawNumber} date={latest.draw.date} />
          )}
        </div>
      </div>
    </main>
  );
}
