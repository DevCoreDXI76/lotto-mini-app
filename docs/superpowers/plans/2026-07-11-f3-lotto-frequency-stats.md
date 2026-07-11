# F3: 역대 최다 출현 번호 통계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1회차부터 현재까지 전체 회차 당첨번호를 집계해 번호별 출현 빈도 TOP 6 + 전체 45위 순위를 보여주는 F3 통계 기능을 구현한다.

**Architecture:** 기존 `scripts/fetch-lotto-history.ts`를 확장해 전체 회차(1~1231회) 원본 데이터를 별도 파일(`data/lotto-full-history.json`)로 수집한다. `lib/lotto/stats.ts`의 순수 함수가 이 원본 데이터로부터 즉시 빈도 순위를 계산하고, `app/stats/page.tsx`(Server Component)와 홈 화면 미리보기 카드가 이를 사용한다. 사전 집계 캐시 파일은 만들지 않는다.

**Tech Stack:** 기존과 동일 (Next.js App Router, TS, Tailwind, Vitest).

## Global Constraints

- 기존 `data/lotto-history-seed.json`(F1/F2용, 최근 150회차)은 이번 작업에서 건드리지 않는다 — 새 전체 회차 데이터는 별도 파일 `data/lotto-full-history.json`에 저장한다.
- 전체 회차 수집 상한은 1231회(현재 캐시된 최신 확정 회차)로 한다.
- 사전 집계 캐시 파일(번호→횟수만 담은 JSON)은 만들지 않는다 — 원본 전체 회차 JSON만 저장하고 서버 컴포넌트에서 즉시 계산한다.
- 순위는 출현 횟수 내림차순, 동률이면 번호 오름차순으로 정렬하고 1~45위를 순차 부여한다(동순위 표기 없음).
- 앱 전체 어디에도 별점·순위 우열 암시·"AI"·"추천" 표현을 쓰지 않는다는 기존 F5 원칙을 유지한다 — 이번 F3의 "순위"는 실제 통계적 서열(출현 횟수)이므로 허용되지만, 이를 "더 나은 번호"처럼 포장하는 문구는 추가하지 않는다.
- F3 결과 화면의 디스클레이머 문구는 정확히 다음을 사용한다: "이 통계는 과거 데이터일 뿐이며 향후 당첨을 예측하지 않습니다."

---

## Task 1: 전체 회차 데이터 수집 스크립트 확장 + 실행

**Files:**
- Modify: `scripts/fetch-lotto-history.ts`
- Create (생성물): `data/lotto-full-history.json`

**Interfaces:**
- Produces: `data/lotto-full-history.json` — `LottoDraw[]` 형태, 1~1231회 전체. Task 4(stats 페이지), Task 5(홈 미리보기)가 사용.

- [ ] **Step 1: 출력 파일명을 3번째 인자로 받도록 스크립트 수정**

`scripts/fetch-lotto-history.ts` 전체를 다음으로 교체:

```ts
// picknum.com에서 회차별 당첨번호를 순회 수집해 지정된 JSON 파일로 저장한다.
// 사용법: npx tsx scripts/fetch-lotto-history.ts <startRound> <endRound> [outputFileName]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface LottoDraw {
  drawNumber: number;
  date: string;
  numbers: [number, number, number, number, number, number];
  bonusNumber: number;
}

const PATTERN =
  /"drawNumber\\?":(\d+),\\?"date\\?":\\?"([\d-]+)\\?",\\?"numbers\\?":\[([\d,]+)\],\\?"bonusNumber\\?":(\d+)/;

async function fetchRound(round: number): Promise<LottoDraw | null> {
  const res = await fetch(`https://picknum.com/lotto/${round}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(PATTERN);
  if (!match) return null;

  const [, drawNumber, date, numbersRaw, bonusNumber] = match;
  const numbers = numbersRaw.split(',').map(Number);
  if (numbers.length !== 6) return null;

  return {
    drawNumber: Number(drawNumber),
    date,
    numbers: numbers as LottoDraw['numbers'],
    bonusNumber: Number(bonusNumber),
  };
}

async function main() {
  const [startArg, endArg, outputArg] = process.argv.slice(2);
  const start = Number(startArg ?? 1082);
  const end = Number(endArg ?? 1231);
  const outputFile = outputArg ?? 'lotto-history-seed.json';

  const draws: LottoDraw[] = [];
  for (let round = end; round >= start; round--) {
    const draw = await fetchRound(round);
    if (draw) {
      draws.push(draw);
      console.log(`fetched round ${round}`);
    } else {
      console.warn(`skip round ${round}: no match`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  writeFileSync(join(process.cwd(), 'data', outputFile), JSON.stringify(draws, null, 2));

  if (draws.length > 0) {
    writeFileSync(
      join(process.cwd(), 'data', 'latest-draw-fallback.json'),
      JSON.stringify(draws[0], null, 2),
    );
  }

  console.log(`done: ${draws.length} draws saved to ${outputFile}`);
}

main();
```

- [ ] **Step 2: 전체 회차(1~1231회) 수집 실행**

Run: `npx tsx scripts/fetch-lotto-history.ts 1 1231 lotto-full-history.json`

주의: 1231회 순회 조회(회차당 150ms 지연 포함)라 최소 3~5분, 네트워크 상황에 따라 더 오래 걸릴 수 있다. 도중에 중단하지 말고 완료될 때까지 기다린다.

Expected: 콘솔에 회차별 `fetched round N` 또는 `skip round N: no match` 로그가 순차 출력되고, 마지막 줄에 `done: N draws saved to lotto-full-history.json` (N은 1231에 근접한 값, 일부 초기 회차는 사이트 포맷 차이로 파싱 실패해 스킵될 수 있음 — 정상).

- [ ] **Step 3: 결과 검증**

Run: `node -e "const d=require('./data/lotto-full-history.json'); console.log(d.length, d[0], d[d.length-1])"`
Expected: 배열 길이가 1000 이상이고, `d[0]`(첫 원소, drawNumber 내림차순 정렬 전이므로 수집 순서상 1231회 근처)과 `d[d.length-1]`(1회 근처)이 각각 `drawNumber`, `date`, `numbers`(6개), `bonusNumber`를 가짐.

- [ ] **Step 4: 커밋**

```bash
git add scripts/fetch-lotto-history.ts data/lotto-full-history.json
git commit -m "feat: collect full lotto draw history for frequency stats"
```

## Task 2: 빈도 순위 집계 로직 (`lib/lotto/stats.ts`)

**Files:**
- Create: `lib/lotto/stats.ts`
- Test: `lib/lotto/stats.test.ts`

**Interfaces:**
- Consumes: `ALL_NUMBERS` from `lib/lotto/weights.ts`, `LottoDraw` from `lib/lotto/types.ts`
- Produces: `FrequencyRankEntry { number: number; count: number; rank: number }`, `computeFrequencyRanking(history: LottoDraw[]): FrequencyRankEntry[]` — Task 4(`/stats` 페이지), Task 5(홈 미리보기)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lotto/stats.test.ts
import { describe, it, expect } from 'vitest';
import { computeFrequencyRanking } from './stats';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 2, date: '2025-12-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 2, 3, 10, 11, 12], bonusNumber: 13 },
];

describe('computeFrequencyRanking', () => {
  it('counts occurrences per number correctly', () => {
    const ranking = computeFrequencyRanking(history);
    const one = ranking.find((r) => r.number === 1)!;
    const four = ranking.find((r) => r.number === 4)!;
    const forty = ranking.find((r) => r.number === 40)!;
    expect(one.count).toBe(2);
    expect(four.count).toBe(1);
    expect(forty.count).toBe(0);
  });

  it('returns all 45 numbers including those with zero occurrences', () => {
    const ranking = computeFrequencyRanking(history);
    expect(ranking).toHaveLength(45);
    expect(new Set(ranking.map((r) => r.number)).size).toBe(45);
  });

  it('sorts by count descending, tie-broken by number ascending', () => {
    const ranking = computeFrequencyRanking(history);
    for (let i = 1; i < ranking.length; i++) {
      const prev = ranking[i - 1];
      const curr = ranking[i];
      const orderedByCount = prev.count > curr.count;
      const tiedAndOrderedByNumber = prev.count === curr.count && prev.number < curr.number;
      expect(orderedByCount || tiedAndOrderedByNumber).toBe(true);
    }
  });

  it('assigns sequential ranks from 1 to 45', () => {
    const ranking = computeFrequencyRanking(history);
    expect(ranking.map((r) => r.rank)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/stats.test.ts`
Expected: FAIL (`stats.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/lotto/stats.ts
import { ALL_NUMBERS } from './weights';
import type { LottoDraw } from './types';

export interface FrequencyRankEntry {
  number: number;
  count: number;
  rank: number;
}

export function computeFrequencyRanking(history: LottoDraw[]): FrequencyRankEntry[] {
  const counts = new Map<number, number>();
  for (const n of ALL_NUMBERS) counts.set(n, 0);

  for (const draw of history) {
    for (const n of draw.numbers) {
      if (counts.has(n)) counts.set(n, counts.get(n)! + 1);
    }
  }

  const sorted = ALL_NUMBERS.map((number) => ({ number, count: counts.get(number)! })).sort(
    (a, b) => b.count - a.count || a.number - b.number,
  );

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/stats.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/stats.ts lib/lotto/stats.test.ts
git commit -m "feat: add frequency ranking computation for full draw history"
```

## Task 3: 전체 순위 펼쳐보기 컴포넌트 (`components/lotto/FullRankingToggle.tsx`)

**Files:**
- Create: `components/lotto/FullRankingToggle.tsx`

**Interfaces:**
- Consumes: `FrequencyRankEntry` from `lib/lotto/stats.ts`
- Produces: `FullRankingToggle({ entries }: { entries: FrequencyRankEntry[] })` — Task 4(`/stats` 페이지)가 사용.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// components/lotto/FullRankingToggle.tsx
'use client';

import { useState } from 'react';
import type { FrequencyRankEntry } from '@/lib/lotto/stats';

export function FullRankingToggle({ entries }: { entries: FrequencyRankEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-sm text-gray-500 py-2"
      >
        {expanded ? '접기' : '전체 1~45번 순위 펼쳐보기'}
      </button>
      {expanded && (
        <table className="w-full text-sm" aria-label="전체 45개 번호 출현 순위표">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">순위</th>
              <th className="py-1">번호</th>
              <th className="py-1">출현 횟수</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.number} className="border-t">
                <td className="py-1">{entry.rank}</td>
                <td className="py-1">{entry.number}</td>
                <td className="py-1">{entry.count}회</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/lotto/FullRankingToggle.tsx
git commit -m "feat: add full ranking toggle component"
```

## Task 4: `/stats` 페이지 (신규 Server Component)

**Files:**
- Create: `app/stats/page.tsx`

**Interfaces:**
- Consumes: `data/lotto-full-history.json`, `LottoDraw` from `lib/lotto/types.ts`, `computeFrequencyRanking` from `lib/lotto/stats.ts`, `NumberBall` from `components/lotto/NumberBall.tsx`, `FullRankingToggle` from `components/lotto/FullRankingToggle.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
// app/stats/page.tsx
import Link from 'next/link';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeFrequencyRanking } from '@/lib/lotto/stats';
import { NumberBall } from '@/components/lotto/NumberBall';
import { FullRankingToggle } from '@/components/lotto/FullRankingToggle';

export default function StatsPage() {
  const history = fullHistory as LottoDraw[];
  const ranking = computeFrequencyRanking(history);
  const top6 = ranking.slice(0, 6);
  const rounds = history.map((d) => d.drawNumber);
  const minRound = Math.min(...rounds);
  const maxRound = Math.max(...rounds);
  const latestDraw = history.find((d) => d.drawNumber === maxRound)!;

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">역대 통계</h1>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="font-semibold">역대 가장 많이 나온 번호는 {top6[0].number}번입니다.</p>
        <ul className="mt-3 space-y-2">
          {top6.map((entry) => (
            <li key={entry.number} className="flex items-center gap-3">
              <NumberBall n={entry.number} />
              <span className="text-sm text-gray-600">{entry.count}회</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        {minRound}회 ~ {maxRound}회 기준, 최종 갱신 {latestDraw.date}
      </p>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <FullRankingToggle entries={ranking} />
      </div>

      <p className="text-sm text-gray-500">
        이 통계는 과거 데이터일 뿐이며 향후 당첨을 예측하지 않습니다.
      </p>

      <Link href="/" className="block text-center text-sm text-gray-500 underline">
        홈으로
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: 브라우저에서 수동 검증**

Run: `npm run dev`, 브라우저에서 `http://localhost:3000/stats` 접속.
Expected: "역대 가장 많이 나온 번호는 O번입니다" 문구와 TOP 6 리스트(번호+횟수)가 보이고, 회차 범위 문구가 표시됨. "전체 1~45번 순위 펼쳐보기" 클릭 시 45행 표가 나타나고 다시 클릭하면 접힘. "홈으로" 링크로 `/`로 이동.

- [ ] **Step 3: 커밋**

```bash
git add app/stats
git commit -m "feat: build F3 historical frequency stats page"
```

## Task 5: 홈 화면 TOP 6 미리보기 카드

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `data/lotto-full-history.json`, `computeFrequencyRanking` from `lib/lotto/stats.ts`, `NumberBall` from `components/lotto/NumberBall.tsx`

- [ ] **Step 1: `app/page.tsx` 수정**

`app/page.tsx` 전체를 다음으로 교체:

```tsx
import Link from 'next/link';
import { LatestDraw } from '@/components/lotto/LatestDraw';
import { Disclaimer } from '@/components/lotto/Disclaimer';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeFrequencyRanking } from '@/lib/lotto/stats';
import { NumberBall } from '@/components/lotto/NumberBall';

export default function Home() {
  const history = fullHistory as LottoDraw[];
  const top6 = computeFrequencyRanking(history).slice(0, 6);

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">로또 미니앱</h1>
      <LatestDraw />
      <Link
        href="/generator"
        className="block text-center bg-black text-white rounded-lg py-3 font-semibold"
      >
        번호 생성기 바로가기
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-sm mb-2">역대 최다 출현 TOP 6</h2>
        <div className="flex flex-wrap gap-2">
          {top6.map((entry) => (
            <NumberBall key={entry.number} n={entry.number} />
          ))}
        </div>
        <Link href="/stats" className="block text-sm text-gray-500 underline mt-3">
          전체 통계 보기 →
        </Link>
      </div>

      <Disclaimer />
      <footer className="text-xs text-gray-400 pt-8 border-t">
        이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: 브라우저에서 수동 검증**

Run: `npm run dev`, `http://localhost:3000` 접속.
Expected: 생성기 버튼 아래에 "역대 최다 출현 TOP 6" 카드가 번호 6개와 함께 표시되고, "전체 통계 보기 →" 클릭 시 `/stats`로 이동.

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add TOP 6 frequency preview card to home page"
```

## Task 6: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS (기존 테스트 전부 + `stats.test.ts` 4개 신규).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F3 frequency stats tests, lint, and build pass" --allow-empty
```
