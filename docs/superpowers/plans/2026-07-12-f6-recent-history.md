# F6: 최근 생성 번호 히스토리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세트수 모드(F1)로 생성한 번호 조합을 localStorage에 최근 20개까지 저장하고, `/generator` 페이지 하단에 전략·시각·복사 버튼과 함께 목록으로 보여준다.

**Architecture:** 순서/캡 로직은 순수 함수(`lib/lotto/recentHistory.ts`)로 분리해 단위테스트하고, localStorage 읽기/쓰기는 기존 `useLatestDraw.ts`와 동일한 패턴의 클라이언트 훅(`lib/lotto/useRecentHistory.ts`)에 담는다. UI는 신규 프레젠테이션 컴포넌트(`RecentHistoryList`)로 만들어 `app/generator/page.tsx`에 연결한다.

**Tech Stack:** 기존과 동일 (Next.js App Router, TS, Tailwind, Vitest).

## Global Constraints

- 저장 단위는 게임(조합) 단위다 — 한 번에 여러 세트를 생성해도 세트마다 개별 히스토리 항목이 된다.
- 최대 보관 개수는 20개다(`MAX_HISTORY_ENTRIES`). 초과분은 오래된 것부터 삭제한다.
- **세트수 모드(F1)에서 생성했을 때만** 히스토리에 추가한다. 예산 모드(F2, 최대 200게임)는 대상에서 제외한다.
- localStorage 키는 `lotto-recent-history`로 고정한다.
- 전체 지우기 기능은 만들지 않는다 — 항목별 복사 버튼만 제공한다.
- `/generator` 페이지 하단에 인라인 섹션으로 배치하고, 항목이 있을 때만(모드와 무관하게) 표시한다.
- 기존 카드 스타일(`rounded-xl bg-white shadow-sm`, `GameResultCard`와 동일한 복사 인터랙션)을 재사용한다.
- `localStorage` 접근은 반드시 `useEffect`/이벤트 핸들러 안에서만 하고, 초기 로드 setState는 `react-hooks/set-state-in-effect` 규칙에 걸리므로 `eslint-disable-next-line` + 근거 주석으로 처리한다(F5 `FirstVisitNotice.tsx`에서 이미 사용한 패턴).

---

## Task 1: 순수 로직 — `lib/lotto/recentHistory.ts`

**Files:**
- Create: `lib/lotto/recentHistory.ts`
- Test: `lib/lotto/recentHistory.test.ts`

**Interfaces:**
- Consumes: `Strategy` from `lib/lotto/types.ts`
- Produces: `HistoryEntry { numbers: number[]; strategy: Strategy; timestamp: number }`, `MAX_HISTORY_ENTRIES: number`, `prependEntries(current: HistoryEntry[], newEntries: HistoryEntry[]): HistoryEntry[]` — Task 2(`useRecentHistory.ts`), Task 3(`RecentHistoryList.tsx`)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lotto/recentHistory.test.ts
import { describe, it, expect } from 'vitest';
import { prependEntries, MAX_HISTORY_ENTRIES } from './recentHistory';
import type { HistoryEntry } from './recentHistory';

function makeEntry(n: number): HistoryEntry {
  return { numbers: [n], strategy: 'random', timestamp: n };
}

describe('prependEntries', () => {
  it("adds new entries before existing ones, preserving the new entries' given order", () => {
    const current = [makeEntry(1), makeEntry(2)];
    const incoming = [makeEntry(10), makeEntry(11)];
    const result = prependEntries(current, incoming);
    expect(result).toEqual([makeEntry(10), makeEntry(11), makeEntry(1), makeEntry(2)]);
  });

  it('caps the result at MAX_HISTORY_ENTRIES, dropping the oldest (tail) entries', () => {
    const current = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, i) => makeEntry(i));
    const incoming = [makeEntry(100)];
    const result = prependEntries(current, incoming);
    expect(result).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(result[0]).toEqual(makeEntry(100));
    expect(result[result.length - 1]).toEqual(makeEntry(MAX_HISTORY_ENTRIES - 2));
  });

  it('returns just the new entries when current is empty', () => {
    const result = prependEntries([], [makeEntry(1)]);
    expect(result).toEqual([makeEntry(1)]);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/recentHistory.test.ts`
Expected: FAIL (`recentHistory.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/lotto/recentHistory.ts
import type { Strategy } from './types';

export interface HistoryEntry {
  numbers: number[];
  strategy: Strategy;
  timestamp: number;
}

export const MAX_HISTORY_ENTRIES = 20;

export function prependEntries(
  current: HistoryEntry[],
  newEntries: HistoryEntry[],
): HistoryEntry[] {
  return [...newEntries, ...current].slice(0, MAX_HISTORY_ENTRIES);
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/recentHistory.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/recentHistory.ts lib/lotto/recentHistory.test.ts
git commit -m "feat: add recent-history prepend/cap logic"
```

## Task 2: localStorage 훅 — `lib/lotto/useRecentHistory.ts`

**Files:**
- Create: `lib/lotto/useRecentHistory.ts`

**Interfaces:**
- Consumes: `prependEntries`, `HistoryEntry` from `lib/lotto/recentHistory.ts`; `GeneratedGame`, `Strategy` from `lib/lotto/types.ts`
- Produces: `useRecentHistory(): { entries: HistoryEntry[]; addGames: (games: GeneratedGame[], strategy: Strategy) => void }` — Task 4(`app/generator/page.tsx`)가 사용.

- [ ] **Step 1: 훅 작성**

```ts
// lib/lotto/useRecentHistory.ts
'use client';

import { useEffect, useState } from 'react';
import { prependEntries, type HistoryEntry } from './recentHistory';
import type { GeneratedGame, Strategy } from './types';

const STORAGE_KEY = 'lotto-recent-history';

function loadEntries(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

export function useRecentHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    // localStorage isn't available during server rendering, so the initial
    // load can only happen client-side after mount — same one-time browser-API
    // sync as FirstVisitNotice.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
  }, []);

  function addGames(games: GeneratedGame[], strategy: Strategy) {
    const timestamp = Date.now();
    const newEntries: HistoryEntry[] = games.map((g) => ({
      numbers: g.numbers,
      strategy,
      timestamp,
    }));
    setEntries((current) => {
      const updated = prependEntries(current, newEntries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return { entries, addGames };
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add lib/lotto/useRecentHistory.ts
git commit -m "feat: add useRecentHistory localStorage hook"
```

## Task 3: UI 컴포넌트 — `components/lotto/RecentHistoryList.tsx`

**Files:**
- Create: `components/lotto/RecentHistoryList.tsx`

**Interfaces:**
- Consumes: `HistoryEntry` from `lib/lotto/recentHistory.ts`; `STRATEGIES` from `lib/lotto/types.ts`; `NumberBall` from `./NumberBall`
- Produces: `RecentHistoryList({ entries: HistoryEntry[] })` — Task 4(`app/generator/page.tsx`)가 사용.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// components/lotto/RecentHistoryList.tsx
'use client';

import { useState } from 'react';
import { NumberBall } from './NumberBall';
import { STRATEGIES } from '@/lib/lotto/types';
import type { HistoryEntry } from '@/lib/lotto/recentHistory';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [copied, setCopied] = useState(false);
  const label = STRATEGIES.find((s) => s.id === entry.strategy)?.label ?? entry.strategy;

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.numbers.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl p-3 bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {entry.numbers.map((n) => (
            <NumberBall key={n} n={n} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3">
        <span className="text-xs text-gray-400">
          {label} · {formatTime(entry.timestamp)}
        </span>
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

export function RecentHistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-sm">최근 생성 기록</h2>
      {entries.map((entry, i) => (
        <HistoryRow key={`${entry.timestamp}-${i}`} entry={entry} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add components/lotto/RecentHistoryList.tsx
git commit -m "feat: add RecentHistoryList presentational component"
```

## Task 4: `app/generator/page.tsx` 연결

**Files:**
- Modify: `app/generator/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: `useRecentHistory` from `lib/lotto/useRecentHistory.ts`, `RecentHistoryList` from `components/lotto/RecentHistoryList.tsx`

- [ ] **Step 1: 파일 전체 교체**

`app/generator/page.tsx` 전체를 다음으로 교체:

```tsx
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
import { useRecentHistory } from '@/lib/lotto/useRecentHistory';
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
import { RecentHistoryList } from '@/components/lotto/RecentHistoryList';

export default function GeneratorPage() {
  const history = useMemo(() => loadHistory(), []);
  const latest = useLatestDraw();
  const { entries: recentHistory, addGames } = useRecentHistory();
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
    const newGames = generateUniqueGames(strategy, gameCount, excluded, history, Math.random, included);
    setGames(newGames);
    if (mode === 'count') {
      addGames(newGames, strategy);
    }
  }

  const selectedStrategyMeta = STRATEGIES.find((s) => s.id === strategy)!;

  const activity = useMemo(
    () => computeActivity(getProfileWeights(strategy, history, excluded)),
    [strategy, history, excluded],
  );
  const topActivityNumbers = useMemo(
    () =>
      [...activity]
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((a) => a.number),
    [activity],
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
    <main className="min-w-0 min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
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
                className={`flex-1 py-2 rounded-lg text-sm transition-shadow ${mode === 'count' ? 'bg-black text-white shadow-md' : 'bg-white shadow-sm hover:shadow'}`}
              >
                세트 수로 선택
              </button>
              <button
                type="button"
                onClick={() => setMode('budget')}
                className={`flex-1 py-2 rounded-lg text-sm transition-shadow ${mode === 'budget' ? 'bg-black text-white shadow-md' : 'bg-white shadow-sm hover:shadow'}`}
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
              className="w-full bg-white rounded-lg px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="예: 3, 17, 45"
            />
          </div>

          <IncludeNumbersInput value={includedInput} onChange={setIncludedInput} excluded={excluded} />

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-black text-white rounded-lg py-3 font-semibold shadow-md"
          >
            번호 생성하기
          </button>
        </div>

        <div className="space-y-6">
          <LatestDraw />

          {mode === 'count' && (
            <>
              <AlgorithmSummaryCard strategy={selectedStrategyMeta} topNumbers={topActivityNumbers} />
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
              <div className="bg-white rounded-xl shadow-sm p-4">
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

      <div className="mt-6">
        <RecentHistoryList entries={recentHistory} />
      </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 브라우저(Playwright)로 수동 검증**

이 검증은 localStorage에 의존하는 상태 변화를 확인해야 하므로 curl만으로는 부족하다. 짧은 헤드리스 Playwright 스크립트로 확인한다(F5 Task 1에서 쓴 것과 동일한 접근 — `npm run dev -- -p <포트>` 백그라운드 실행, `playwright` Python 패키지는 이미 설치돼 있고 `py` 인터프리터 사용).

확인할 시나리오:
1. 새 브라우저 컨텍스트(빈 localStorage)로 `/generator` 접속 → 기본 "세트 수로 선택" 모드에서 전략을 하나 선택하고(예: 클릭으로 "빈도 기반" 선택) "번호 생성하기" 클릭 → 결과 카드가 나타난 직후, 결과 카드 개수와 동일한 개수의 "최근 생성 기록" 항목이 나타나고, 각 항목에 "빈도 기반" 라벨과 시:분 형식 시각이 표시되는지 확인.
2. 페이지를 새로고침 → "최근 생성 기록" 항목이 그대로 유지되는지 확인(localStorage 영속성).
3. "예산으로 선택" 모드로 전환 후 아무 프리셋으로 "번호 생성하기" 클릭 → "최근 생성 기록" 항목 개수가 1단계 이후와 동일하게 유지되는지 확인(예산 모드는 히스토리에 추가되지 않음).
4. 다시 "세트 수로 선택" 모드로 돌아가 다른 전략으로 한 번 더 생성 → 새 항목들이 목록 맨 위에 추가되고, 이전 항목들이 그 아래로 밀리는지 확인.
5. 목록의 첫 번째(가장 최근) 항목의 "복사" 버튼을 클릭 → 클립보드 내용이 그 항목의 번호와 일치하고, 버튼 텍스트가 "복사됨"으로 잠시 바뀌는지 확인.

검증 후 개발 서버 프로세스를 반드시 종료하고 포트가 해제됐는지 확인한다(Windows에서 `npm run dev` 백그라운드 프로세스가 부모만 죽고 실제 next 서버는 좀비로 남는 경우가 있으므로, `netstat`으로 확인 후 필요하면 `taskkill //F //PID <PID> //T`로 정리).

- [ ] **Step 3: 커밋**

```bash
git add app/generator/page.tsx
git commit -m "feat: wire recent-history tracking and list into generator page"
```

## Task 5: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS (기존 테스트 전부 + `recentHistory.test.ts` 3개 신규).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F6 recent-history tests, lint, and build pass" --allow-empty
```
