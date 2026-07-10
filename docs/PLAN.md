# 로또 미니앱 F1+F2 초기 구현 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + TypeScript + Tailwind 프로젝트를 세팅하고, F1(번호 생성기)과 F2(예산 기반 생성)를 규칙 기반 로직으로 구현한다.

**Architecture:** App Router 기반 단일 페이지(`/generator`)에서 전략 선택 → (세트수 or 예산) → 결과를 렌더링. 번호 생성 로직은 `lib/lotto/*`의 순수 TS 함수로 분리해 단위 테스트 가능하게 만든다. 직전 회차 당첨번호는 서버 라우트(`/api/lotto/latest`)가 외부 소스를 시도하고 실패 시 정적 캐시(JSON)로 폴백한다. 히스토리 통계(빈도/이월/저출현)는 빌드 시 미리 수집한 정적 JSON(`data/lotto-history-seed.json`)을 읽어 계산한다.

**Tech Stack:** Next.js (App Router, TS), Tailwind CSS, Vitest(단위 테스트), Node 24 / npm 11 (로컬 확인됨).

## Global Constraints

- UI 어디에도 "당첨 확률", "적중률", "보장" 단어를 쓰지 않는다 (spec 6절 F1).
- 결과 화면에는 항상 "실제 당첨 확률과는 무관한 재미 요소입니다" 문구를 노출한다 (spec 6절 F1).
- 유료 결제/구독/환불 UI 요소를 포함하지 않는다 (spec 1절, 9절).
- 로또 1게임 = 1,000원, 게임 수 = 금액 ÷ 1000 (소수점 절사) (spec 6절 F2).
- 예산 강제 상한 200,000원(200게임), 5,000원 초과 시 "온라인으로 직접 구매 시 1회 한도는 5,000원입니다" 참고 문구 노출 (spec 6절 F2).
- 번호 생성 로직은 순수 규칙/통계 기반, LLM 사용하지 않음 (spec 3절, 13절).

## 데이터 소스 조사 결과 (8절 Open Questions 관련, 구현에 반영)

- **동행복권 비공식 JSON 엔드포인트(`dhlottery.co.kr/common.do?method=getLottoNumber`)는 이 환경에서 curl/서버사이드 요청 시 헤더·쿠키·세션 조합을 바꿔도 전부 홈페이지로 302 리다이렉트됨** — 현재 접근 불가로 확인. `gameResult.do?method=byWin` HTML 결과 페이지도 동일하게 차단됨. 커뮤니티 비공식 라이브러리(GitHub `roeniss/dhlottery-api`)는 2026-05까지 활발히 유지보수되고 있어 브라우저 자동화 등 다른 방식으로는 여전히 동작할 가능성이 있으나, 서버리스 함수의 단순 fetch로는 신뢰할 수 없음 → **정적 캐시 폴백 필수로 설계**.
- **공공데이터에는 당첨번호 자체를 제공하는 데이터셋이 없음** — data.go.kr에는 판매점 현황/주소만 있고 당첨번호 오픈API는 존재하지 않음(확인됨).
- **대안으로 `picknum.com/lotto/{회차}` 페이지가 회차별 당첨번호를 구조화된 JSON(`drawNumber`, `date`, `numbers`, `bonusNumber`)으로 임베드하고 있고, curl로 정상 접근 확인됨** (1회차 `2002-12-07: 10,23,29,33,37,40 보너스16`, 1231회차 `2026-07-04: 4,13,14,18,31,38 보너스15` 모두 검증). 비공식 제3자 사이트이므로 안정성 보장은 없지만 현재 유일하게 서버사이드에서 접근 가능한 소스 → **F1/F2 구현에서는 이 소스를 1차 시도로 쓰고, 실패 시 정적 캐시로 폴백**.
- **공공데이터포털 "온라인복권 1등 당첨 판매점 현황" 데이터셋 갱신주기는 "연간"으로 확인됨** — spec 5절의 "주 단위 갱신" 가정과 다름(참고: 이 항목은 F4 범위라 이번 구현에는 반영하지 않지만, F4 구현 시점에 spec을 수정해야 함).

## Task 1: Next.js 프로젝트 스캐폴딩

**Files:**
- Create: 프로젝트 루트 전체 (`package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.eslintrc` 등 — `create-next-app`이 생성)

- [ ] **Step 1: create-next-app 실행**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: 개발 서버 기동 확인**

Run: `npm run dev` (백그라운드) 후 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: `200`

- [ ] **Step 3: Vitest 설치 및 설정**

```bash
npm install -D vitest @vitejs/plugin-react
```

`vitest.config.ts` 생성:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run"
```

- [ ] **Step 4: 커밋**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind project"
```

## Task 2: 로또 도메인 타입 정의

**Files:**
- Create: `lib/lotto/types.ts`

**Interfaces:**
- Produces: `LottoDraw`, `Strategy`, `GeneratedGame` 타입 — 이후 모든 태스크가 사용.

- [ ] **Step 1: 타입 파일 작성**

```ts
export type Strategy = 'frequency' | 'carryover' | 'balanced' | 'cold' | 'random';

export const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: 'frequency', label: '빈도 기반' },
  { id: 'carryover', label: '이월수 반영' },
  { id: 'balanced', label: '균형 조합' },
  { id: 'cold', label: '미출현 번호 역추세' },
  { id: 'random', label: '종합 랜덤' },
];

export interface LottoDraw {
  drawNumber: number;
  date: string;
  numbers: [number, number, number, number, number, number];
  bonusNumber: number;
}

export interface GeneratedGame {
  numbers: number[];
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/lotto/types.ts
git commit -m "feat: add lotto domain types"
```

## Task 3: 가중 샘플링 + 5가지 전략 구현

**Files:**
- Create: `lib/lotto/strategies.ts`
- Test: `lib/lotto/strategies.test.ts`

**Interfaces:**
- Consumes: `LottoDraw`, `Strategy` from `lib/lotto/types.ts`
- Produces: `pickWeighted(weights: Map<number, number>, count: number, rng?: () => number): number[]`, `generateByStrategy(strategy: Strategy, history: LottoDraw[], excluded: number[], rng?: () => number): number[]` — Task 4가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { generateByStrategy } from './strategies';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 3, date: '2026-01-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
  { drawNumber: 2, date: '2025-12-01', numbers: [1, 2, 3, 10, 11, 12], bonusNumber: 13 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 40, 41, 42, 43, 44], bonusNumber: 45 },
];

describe('generateByStrategy', () => {
  it('returns 6 unique numbers between 1 and 45 for every strategy', () => {
    const strategies = ['frequency', 'carryover', 'balanced', 'cold', 'random'] as const;
    for (const strategy of strategies) {
      const result = generateByStrategy(strategy, history, [], () => 0.5);
      expect(result).toHaveLength(6);
      expect(new Set(result).size).toBe(6);
      for (const n of result) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
    }
  });

  it('never returns excluded numbers', () => {
    const excluded = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = generateByStrategy('random', history, excluded, Math.random);
    for (const n of result) {
      expect(excluded).not.toContain(n);
    }
  });

  it('frequency strategy favors numbers with higher historical frequency over many trials', () => {
    let countOf1 = 0;
    let countOf20 = 0;
    for (let i = 0; i < 200; i++) {
      const result = generateByStrategy('frequency', history, [], Math.random);
      if (result.includes(1)) countOf1++;
      if (result.includes(20)) countOf20++;
    }
    // 1 appears in all 3 historical draws, 20 appears in none
    expect(countOf1).toBeGreaterThan(countOf20);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/strategies.test.ts`
Expected: FAIL (`strategies.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
import type { LottoDraw, Strategy } from './types';

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

export function pickWeighted(
  weights: Map<number, number>,
  count: number,
  rng: () => number = Math.random,
): number[] {
  const pool = new Map(weights);
  const picked: number[] = [];

  while (picked.length < count && pool.size > 0) {
    const total = [...pool.values()].reduce((sum, w) => sum + w, 0);
    let threshold = rng() * total;
    let chosen: number | null = null;

    for (const [num, w] of pool) {
      threshold -= w;
      if (threshold <= 0) {
        chosen = num;
        break;
      }
    }

    if (chosen === null) chosen = [...pool.keys()][pool.size - 1];
    picked.push(chosen);
    pool.delete(chosen);
  }

  return picked;
}

function baseWeights(excluded: number[]): Map<number, number> {
  const excludedSet = new Set(excluded);
  const weights = new Map<number, number>();
  for (const n of ALL_NUMBERS) {
    if (!excludedSet.has(n)) weights.set(n, 1);
  }
  return weights;
}

function frequencyWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  for (const draw of history) {
    for (const n of draw.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 1);
    }
  }
  return weights;
}

function carryoverWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = [...history].sort((a, b) => b.drawNumber - a.drawNumber)[0];
  if (latest) {
    for (const n of latest.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 5);
    }
  }
  return weights;
}

function coldWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const sorted = [...history].sort((a, b) => b.drawNumber - a.drawNumber);
  const lastSeenGap = new Map<number, number>();

  for (const n of ALL_NUMBERS) lastSeenGap.set(n, sorted.length);
  sorted.forEach((draw, gap) => {
    for (const n of draw.numbers) {
      if (lastSeenGap.get(n) === sorted.length) lastSeenGap.set(n, gap);
    }
  });

  for (const [n, gap] of lastSeenGap) {
    if (weights.has(n)) weights.set(n, weights.get(n)! + gap);
  }
  return weights;
}

function balancedPick(excluded: number[], rng: () => number): number[] {
  const excludedSet = new Set(excluded);
  const pool = ALL_NUMBERS.filter((n) => !excludedSet.has(n));

  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidate = shuffled.slice(0, 6);
    if (candidate.length < 6) return candidate;

    const oddCount = candidate.filter((n) => n % 2 === 1).length;
    const lowCount = candidate.filter((n) => n <= 22).length;

    if (oddCount >= 2 && oddCount <= 4 && lowCount >= 2 && lowCount <= 4) {
      return candidate;
    }
  }

  return pool.slice(0, 6);
}

export function generateByStrategy(
  strategy: Strategy,
  history: LottoDraw[],
  excluded: number[],
  rng: () => number = Math.random,
): number[] {
  switch (strategy) {
    case 'frequency':
      return pickWeighted(frequencyWeights(history, excluded), 6, rng);
    case 'carryover':
      return pickWeighted(carryoverWeights(history, excluded), 6, rng);
    case 'cold':
      return pickWeighted(coldWeights(history, excluded), 6, rng);
    case 'balanced':
      return balancedPick(excluded, rng);
    case 'random':
    default:
      return pickWeighted(baseWeights(excluded), 6, rng);
  }
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/strategies.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/strategies.ts lib/lotto/strategies.test.ts
git commit -m "feat: implement 5 lotto number generation strategies"
```

## Task 4: 중복 없는 게임셋 생성기

**Files:**
- Create: `lib/lotto/generate.ts`
- Test: `lib/lotto/generate.test.ts`

**Interfaces:**
- Consumes: `generateByStrategy` from `lib/lotto/strategies.ts`, `LottoDraw`, `Strategy`, `GeneratedGame` from `lib/lotto/types.ts`
- Produces: `generateUniqueGames(strategy: Strategy, gameCount: number, excluded: number[], history: LottoDraw[], rng?: () => number): GeneratedGame[]` — Task 7(F1 UI), Task 6(F2 로직)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
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
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/generate.test.ts`
Expected: FAIL (`generate.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
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
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/generate.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/generate.ts lib/lotto/generate.test.ts
git commit -m "feat: add duplicate-free game set generator"
```

## Task 5: 예산 → 게임 수 변환 로직 (F2 핵심)

**Files:**
- Create: `lib/lotto/budget.ts`
- Test: `lib/lotto/budget.test.ts`

**Interfaces:**
- Produces: `BUDGET_PRESETS: number[]`, `ONLINE_LIMIT_WON = 5000`, `OFFLINE_LIMIT_WON = 200000`, `calcBudgetInfo(amountWon: number): { gameCount: number; actualSpentWon: number; exceedsOnlineLimit: boolean; clamped: boolean }` — Task 8(F2 UI)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { calcBudgetInfo, BUDGET_PRESETS, ONLINE_LIMIT_WON, OFFLINE_LIMIT_WON } from './budget';

describe('calcBudgetInfo', () => {
  it('converts a round amount into game count at 1000 won per game', () => {
    expect(calcBudgetInfo(5000)).toEqual({
      gameCount: 5,
      actualSpentWon: 5000,
      exceedsOnlineLimit: true,
      clamped: false,
    });
  });

  it('floors non-1000 multiples and reports the actual spend', () => {
    const info = calcBudgetInfo(4500);
    expect(info.gameCount).toBe(4);
    expect(info.actualSpentWon).toBe(4000);
  });

  it('flags amounts over the 5000 won online limit', () => {
    expect(calcBudgetInfo(1000).exceedsOnlineLimit).toBe(false);
    expect(calcBudgetInfo(6000).exceedsOnlineLimit).toBe(true);
  });

  it('clamps to the 200,000 won offline hard cap', () => {
    const info = calcBudgetInfo(500000);
    expect(info.gameCount).toBe(200);
    expect(info.actualSpentWon).toBe(OFFLINE_LIMIT_WON);
    expect(info.clamped).toBe(true);
  });

  it('exposes the required presets', () => {
    expect(BUDGET_PRESETS).toEqual([1000, 5000, 10000, 20000, 50000]);
    expect(ONLINE_LIMIT_WON).toBe(5000);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/budget.test.ts`
Expected: FAIL (`budget.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
export const BUDGET_PRESETS = [1000, 5000, 10000, 20000, 50000];
export const ONLINE_LIMIT_WON = 5000;
export const OFFLINE_LIMIT_WON = 200000;
const WON_PER_GAME = 1000;

export interface BudgetInfo {
  gameCount: number;
  actualSpentWon: number;
  exceedsOnlineLimit: boolean;
  clamped: boolean;
}

export function calcBudgetInfo(amountWon: number): BudgetInfo {
  const clamped = amountWon > OFFLINE_LIMIT_WON;
  const effectiveAmount = clamped ? OFFLINE_LIMIT_WON : Math.max(0, amountWon);
  const gameCount = Math.floor(effectiveAmount / WON_PER_GAME);

  return {
    gameCount,
    actualSpentWon: gameCount * WON_PER_GAME,
    exceedsOnlineLimit: amountWon > ONLINE_LIMIT_WON,
    clamped,
  };
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/budget.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/budget.ts lib/lotto/budget.test.ts
git commit -m "feat: add budget-to-game-count conversion logic"
```

## Task 6: 회차 히스토리 시드 데이터 수집 스크립트 + 실행

**Files:**
- Create: `scripts/fetch-lotto-history.ts`
- Create (생성물): `data/lotto-history-seed.json`, `data/latest-draw-fallback.json`

**Interfaces:**
- Produces: `data/lotto-history-seed.json` — `LottoDraw[]` 형태 정적 파일, Task 7(히스토리 로더)이 사용. `data/latest-draw-fallback.json` — 단일 `LottoDraw` 객체, Task 8(API 라우트)이 사용.

- [ ] **Step 1: 스크립트 작성**

```ts
// scripts/fetch-lotto-history.ts
// picknum.com에서 회차별 당첨번호를 순회 수집해 data/lotto-history-seed.json으로 저장한다.
// 사용법: npx tsx scripts/fetch-lotto-history.ts <startRound> <endRound>
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
  const [startArg, endArg] = process.argv.slice(2);
  const start = Number(startArg ?? 1082);
  const end = Number(endArg ?? 1231);

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

  writeFileSync(
    join(process.cwd(), 'data', 'lotto-history-seed.json'),
    JSON.stringify(draws, null, 2),
  );

  if (draws.length > 0) {
    writeFileSync(
      join(process.cwd(), 'data', 'latest-draw-fallback.json'),
      JSON.stringify(draws[0], null, 2),
    );
  }

  console.log(`done: ${draws.length} draws saved`);
}

main();
```

- [ ] **Step 2: `data/` 디렉터리 생성 및 tsx 설치**

```bash
mkdir -p data
npm install -D tsx
```

- [ ] **Step 3: 스크립트 실행 (최근 150회차 수집)**

```bash
npx tsx scripts/fetch-lotto-history.ts 1082 1231
```

Expected: `data/lotto-history-seed.json`에 최대 150개 `LottoDraw` 객체, `data/latest-draw-fallback.json`에 최신 1건 저장. 콘솔에 `done: N draws saved` (N은 130~150 사이 예상, 일부 회차 파싱 실패 가능).

- [ ] **Step 4: 결과 검증**

Run: `node -e "const d=require('./data/lotto-history-seed.json'); console.log(d.length, d[0], d[d.length-1])"`
Expected: 배열 길이가 100 이상이고, 각 원소가 `drawNumber`, `date`, `numbers`(6개), `bonusNumber`를 가짐.

- [ ] **Step 5: 커밋**

```bash
git add scripts/fetch-lotto-history.ts data/lotto-history-seed.json data/latest-draw-fallback.json
git commit -m "feat: add lotto history seed data and fetch script"
```

## Task 7: 히스토리 로더 + 직전 회차 API 라우트

**Files:**
- Create: `lib/lotto/history.ts`
- Create: `app/api/lotto/latest/route.ts`
- Test: `lib/lotto/history.test.ts`

**Interfaces:**
- Consumes: `data/lotto-history-seed.json`, `data/latest-draw-fallback.json`, `LottoDraw` type
- Produces: `loadHistory(): LottoDraw[]` — Task 8(F1/F2 UI)이 사용. `GET /api/lotto/latest` — JSON `{ draw: LottoDraw, source: 'live' | 'cache' }`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { loadHistory } from './history';

describe('loadHistory', () => {
  it('loads a non-empty array of valid LottoDraw objects sorted by drawNumber desc', () => {
    const history = loadHistory();
    expect(history.length).toBeGreaterThan(0);
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].drawNumber).toBeGreaterThan(history[i].drawNumber);
    }
    expect(history[0].numbers).toHaveLength(6);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/history.test.ts`
Expected: FAIL (`history.ts` 모듈이 없음)

- [ ] **Step 3: 히스토리 로더 구현**

```ts
import seed from '@/data/lotto-history-seed.json';
import type { LottoDraw } from './types';

export function loadHistory(): LottoDraw[] {
  const draws = seed as LottoDraw[];
  return [...draws].sort((a, b) => b.drawNumber - a.drawNumber);
}
```

`tsconfig.json`에 JSON 모듈 임포트를 위해 `"resolveJsonModule": true`가 있는지 확인(create-next-app 기본값에 포함됨).

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/history.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: 직전 회차 API 라우트 작성**

```ts
// app/api/lotto/latest/route.ts
import { NextResponse } from 'next/server';
import fallback from '@/data/latest-draw-fallback.json';
import type { LottoDraw } from '@/lib/lotto/types';

const PATTERN =
  /"drawNumber\\?":(\d+),\\?"date\\?":\\?"([\d-]+)\\?",\\?"numbers\\?":\[([\d,]+)\],\\?"bonusNumber\\?":(\d+)/;

async function fetchLiveLatest(candidateRound: number): Promise<LottoDraw | null> {
  try {
    const res = await fetch(`https://picknum.com/lotto/${candidateRound}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
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
  } catch {
    return null;
  }
}

function nextExpectedRound(fallbackDraw: LottoDraw): number {
  const fallbackDate = new Date(fallbackDraw.date);
  const weeksSince = Math.floor((Date.now() - fallbackDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return fallbackDraw.drawNumber + Math.max(0, weeksSince);
}

export async function GET() {
  const cached = fallback as LottoDraw;
  const candidate = nextExpectedRound(cached);

  for (let round = candidate; round >= cached.drawNumber; round--) {
    const live = await fetchLiveLatest(round);
    if (live) {
      return NextResponse.json({ draw: live, source: 'live' as const });
    }
  }

  return NextResponse.json({ draw: cached, source: 'cache' as const });
}
```

- [ ] **Step 6: 개발 서버로 라우트 확인**

Run: `curl -s http://localhost:3000/api/lotto/latest`
Expected: `{"draw":{"drawNumber":...,"date":"...","numbers":[...],"bonusNumber":...},"source":"live"|"cache"}`

- [ ] **Step 7: 커밋**

```bash
git add lib/lotto/history.ts lib/lotto/history.test.ts app/api/lotto/latest/route.ts
git commit -m "feat: add history loader and latest-draw API route with fallback"
```

## Task 8: F1 번호 생성기 UI

**Files:**
- Create: `components/lotto/Disclaimer.tsx`
- Create: `components/lotto/NumberBall.tsx`
- Create: `components/lotto/GameResultCard.tsx`
- Create: `components/lotto/LatestDraw.tsx`
- Create: `app/generator/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `generateUniqueGames` from `lib/lotto/generate.ts`, `loadHistory` from `lib/lotto/history.ts`, `STRATEGIES`, `Strategy`, `GeneratedGame` from `lib/lotto/types.ts`, `GET /api/lotto/latest`.

- [ ] **Step 1: 공용 컴포넌트 작성**

```tsx
// components/lotto/Disclaimer.tsx
export function Disclaimer() {
  return (
    <p className="text-sm text-gray-500 mt-4">
      실제 당첨 확률과는 무관한 재미 요소입니다. 당첨을 보장하지 않습니다.
    </p>
  );
}
```

```tsx
// components/lotto/NumberBall.tsx
const COLORS: Record<string, string> = {
  low: 'bg-yellow-400',
  mid: 'bg-blue-400',
  high: 'bg-red-400',
};

function colorFor(n: number) {
  if (n <= 15) return COLORS.low;
  if (n <= 30) return COLORS.mid;
  return COLORS.high;
}

export function NumberBall({ n }: { n: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white font-bold text-sm ${colorFor(n)}`}
    >
      {n}
    </span>
  );
}
```

```tsx
// components/lotto/GameResultCard.tsx
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
```

```tsx
// components/lotto/LatestDraw.tsx
'use client';

import { useEffect, useState } from 'react';
import { NumberBall } from './NumberBall';
import type { LottoDraw } from '@/lib/lotto/types';

export function LatestDraw() {
  const [data, setData] = useState<{ draw: LottoDraw; source: 'live' | 'cache' } | null>(null);

  useEffect(() => {
    fetch('/api/lotto/latest')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-sm text-gray-400">직전 회차 정보를 불러오는 중입니다...</p>;

  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-gray-500">
        {data.draw.drawNumber}회 ({data.draw.date}){' '}
        {data.source === 'cache' && '· 최신 정보를 불러오지 못해 캐시된 결과를 표시합니다'}
      </p>
      <div className="flex items-center gap-1 mt-2">
        {data.draw.numbers.map((n) => (
          <NumberBall key={n} n={n} />
        ))}
        <span className="mx-1 text-gray-400">+</span>
        <NumberBall n={data.draw.bonusNumber} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 생성기 페이지 작성**

```tsx
// app/generator/page.tsx
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
```

- [ ] **Step 3: 홈페이지에 진입점 연결**

`app/page.tsx`를 다음으로 교체:

```tsx
import Link from 'next/link';
import { LatestDraw } from '@/components/lotto/LatestDraw';
import { Disclaimer } from '@/components/lotto/Disclaimer';

export default function Home() {
  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">로또 미니앱</h1>
      <LatestDraw />
      <Link
        href="/generator"
        className="block text-center bg-black text-white rounded-lg py-3 font-semibold"
      >
        번호 생성기 바로가기
      </Link>
      <Disclaimer />
      <footer className="text-xs text-gray-400 pt-8 border-t">
        이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: 브라우저에서 수동 검증**

Run: `npm run dev`, 브라우저에서 `http://localhost:3000/generator` 접속.
Expected: 전략 버튼 클릭 → 세트 수 슬라이더 조절 → "번호 생성하기" 클릭 시 결과 카드가 세트 수만큼 나타나고, 복사 버튼 클릭 시 "복사됨"으로 바뀜. 제외 번호 입력 시 결과에 해당 번호가 나오지 않음.

- [ ] **Step 5: 커밋**

```bash
git add components/lotto app/generator app/page.tsx
git commit -m "feat: build F1 number generator UI"
```

## Task 9: F2 예산 기반 생성 UI

**Files:**
- Create: `components/lotto/BudgetPicker.tsx`
- Modify: `app/generator/page.tsx`

**Interfaces:**
- Consumes: `calcBudgetInfo`, `BUDGET_PRESETS`, `ONLINE_LIMIT_WON` from `lib/lotto/budget.ts`; `generateUniqueGames`.

- [ ] **Step 1: 예산 선택 컴포넌트 작성**

```tsx
// components/lotto/BudgetPicker.tsx
'use client';

import { BUDGET_PRESETS } from '@/lib/lotto/budget';

export function BudgetPicker({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (amount: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {BUDGET_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              amount === preset ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            {preset.toLocaleString()}원
          </button>
        ))}
      </div>
      <input
        type="number"
        min={0}
        step={1000}
        value={amount}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="직접 입력 (원)"
      />
    </div>
  );
}
```

- [ ] **Step 2: `app/generator/page.tsx`에 모드 토글과 예산 흐름 추가**

`app/generator/page.tsx` 상단 import에 추가:

```tsx
import { useState } from 'react'; // 기존 import에 이미 있으면 생략
import { calcBudgetInfo, ONLINE_LIMIT_WON } from '@/lib/lotto/budget';
import { BudgetPicker } from '@/components/lotto/BudgetPicker';
```

컴포넌트 내부, `count` state 선언부 아래에 추가:

```tsx
const [mode, setMode] = useState<'count' | 'budget'>('count');
const [amount, setAmount] = useState(5000);
const budgetInfo = calcBudgetInfo(amount);
const [collapsed, setCollapsed] = useState(true);
```

`handleGenerate` 함수를 다음으로 교체:

```tsx
function handleGenerate() {
  const gameCount = mode === 'budget' ? budgetInfo.gameCount : count;
  setGames(generateUniqueGames(strategy, gameCount, excluded, history));
}
```

"생성 세트 수" 섹션(`<h2>생성 세트 수...`) 전체를 모드 토글 + 조건부 렌더링으로 교체:

```tsx
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
```

결과 렌더링 부분(`{games.length > 0 && (...)}`)을 접기/펼치기 지원하도록 교체:

```tsx
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
```

- [ ] **Step 3: 브라우저에서 수동 검증**

Run: `npm run dev`, `http://localhost:3000/generator`에서 "예산으로 선택" 클릭.
Expected: 프리셋 버튼(1,000/5,000/10,000/20,000/50,000원) 및 직접 입력 가능. 4,500원 입력 시 "4,000원 · 4게임 (1,000원 단위로 절사됨)" 표시. 6,000원 입력 시 5,000원 한도 안내 노출. 500,000원 입력 시 200게임으로 제한되고 상한 안내 노출. 게임 수 20개 초과 시 "더 보기" 버튼으로 접기/펼치기 동작. 생성된 게임들 간 번호 조합이 중복되지 않음(육안 확인).

- [ ] **Step 4: 커밋**

```bash
git add components/lotto/BudgetPicker.tsx app/generator/page.tsx
git commit -m "feat: build F2 budget-based generation UI"
```

## Task 10: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS (strategies 3개, generate 2개, budget 5개, history 1개 = 11개).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify tests, lint, and build pass" --allow-empty
```

---

## Self-Review 메모

- **Spec 커버리지**: F1의 6개 AC(전략 선택, 세트수 1~5, 제외번호, 디스클레이머 문구, 금칙어 회피, 클립보드 복사, 직전회차 표시) 전부 Task 8에서 구현. F2의 6개 AC(프리셋+직접입력, 게임수=금액÷1000 절사+안내, 중복없는 조합, 전략 선택 가능, 총액·게임수 요약, 5000원 초과 안내, 20만원 상한, 20게임 이상 접기/펼치기) 전부 Task 5, 9에서 구현.
- **F3~F5는 이번 계획 범위 밖** — 사용자가 F1/F2만 먼저 요청함. F5의 최초 진입 1회 안내 모달은 포함하지 않았고, 홈/생성기 화면 하단에 간단한 문구만 넣음(완전한 F5 구현 아님).
- **데이터 소스 리스크**: `picknum.com`은 비공식 제3자 사이트이므로 언제든 구조가 바뀌거나 접근이 막힐 수 있음. `latest-draw-fallback.json` 폴백과 정적 시드 데이터가 이 리스크를 완화하지만, 실제 배포 전 재확인 필요.
