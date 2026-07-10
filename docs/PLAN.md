# F1 리치 UI 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F1 번호 생성기를 5가지 혼합 가중치 전략 + 분석 패널(알고리즘 요약/활성도 차트/후보군/최종 조합 후보)을 갖춘 반응형 UI로 재설계한다. F2는 엔진만 공유하고 UI는 기존 단순 리스트를 유지한다.

**Architecture:** 기존 `lib/lotto/strategies.ts`의 검증된 가중치 로직을 원자 소스(`weights.ts`)와 혼합 전략 조합(`profiles.ts`)으로 분리하고, `strategies.ts`는 얇은 디스패처로 재구성한다. 번호별 특징 태그·후보군 산출은 `analysis.ts`에 신설한다. UI는 `app/generator/page.tsx`를 데스크톱 2열/모바일 1열 반응형으로 재구성하고, 신규 프레젠테이션 컴포넌트들을 `components/lotto/`에 추가한다.

**Tech Stack:** 기존과 동일 (Next.js App Router, TS, Tailwind, Vitest). 차트는 외부 라이브러리 없이 커스텀 CSS 막대그래프로 구현(dataviz 스킬 가이드 적용).

## Global Constraints

- 별점·순위·점수·"AI"·"추천" 등 우열/신뢰를 암시하는 라벨을 UI 어디에도 쓰지 않는다 (PRD F1/F5).
- 번호별 "특징 태그"는 실제 이력 데이터 계산에서 나온 것만 사용한다. 계산 불가능한 항목은 표시하지 않는다 (PRD F1).
- 포함(고정) 번호는 최대 5개까지만 허용한다 (PRD F1).
- F2(예산 기반) UI에는 알고리즘 요약/활성도 차트/후보군/최종 조합 후보 패널을 적용하지 않는다 — 전략 계산 엔진만 공유한다 (PRD F2).
- "종합 랜덤" 전략은 원자 소스 5개(frequency, carryover, cold, neighbor, sameLastDigit)를 각각 ×1로 균등 평균한다 (elite 이중 가중치 방지, 사용자 확정 사항).
- 활성도 차트·특징 태그·최종 조합 후보 카드에는 `aria-label`을 포함한다 (PRD F1 접근성 AC).
- `generateByStrategy`/`generateUniqueGames`의 기존 공개 시그니처(순서상 앞쪽 인자)는 그대로 유지하고 신규 인자는 끝에 추가한다 — F2 호출부를 건드리지 않기 위함.

## Task 1: 원자 가중치 소스 (`lib/lotto/weights.ts`)

**Files:**
- Create: `lib/lotto/weights.ts`
- Test: `lib/lotto/weights.test.ts`
- Modify: `lib/lotto/strategies.ts` (기존 `pickWeighted`/`baseWeights`/`frequencyWeights`/`carryoverWeights`/`coldWeights` 구현을 제거하고 이 파일에서 re-export하지 않음 — Task 4에서 정리)

**Interfaces:**
- Produces: `ALL_NUMBERS`, `baseWeights`, `frequencyWeights`, `carryoverWeights`, `coldWeights`, `neighborWeights`, `sameLastDigitWeights`, `mergeWeights`, `pickWeighted` — Task 3(profiles.ts), Task 6(analysis.ts)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lotto/weights.test.ts
import { describe, it, expect } from 'vitest';
import {
  frequencyWeights,
  carryoverWeights,
  coldWeights,
  neighborWeights,
  sameLastDigitWeights,
  mergeWeights,
  pickWeighted,
} from './weights';
import type { LottoDraw } from './types';

const history: LottoDraw[] = [
  { drawNumber: 2, date: '2025-12-01', numbers: [10, 20, 30, 40, 5, 15], bonusNumber: 25 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
];

describe('atomic weight sources', () => {
  it('frequencyWeights counts historical occurrences per number', () => {
    const weights = frequencyWeights(history, []);
    expect(weights.get(5)).toBe(1 + 2); // base 1 + appears in both draws
    expect(weights.get(45)).toBe(1); // never appears
  });

  it('carryoverWeights boosts only the most recent draw numbers', () => {
    const weights = carryoverWeights(history, []);
    expect(weights.get(10)).toBeGreaterThan(weights.get(1)!);
  });

  it('coldWeights gives higher weight to numbers with a larger gap since last seen', () => {
    const weights = coldWeights(history, []);
    expect(weights.get(45)).toBeGreaterThan(weights.get(10)!);
  });

  it('neighborWeights boosts numbers within +-2 of the latest draw', () => {
    const weights = neighborWeights(history, []);
    expect(weights.get(11)).toBeGreaterThan(weights.get(25)!);
  });

  it('sameLastDigitWeights boosts numbers sharing the last digit with the latest draw', () => {
    const weights = sameLastDigitWeights(history, []);
    expect(weights.get(25)).toBeGreaterThan(weights.get(26)!); // latest draw has 5, 10, 15, 20, 30, 40 (digits 0, 5)
  });

  it('mergeWeights sums weighted sources', () => {
    const a = new Map([[1, 1], [2, 1]]);
    const b = new Map([[1, 1], [2, 1]]);
    const merged = mergeWeights([[a, 3], [b, 1]]);
    expect(merged.get(1)).toBe(3 * 1 + 1 * 1);
  });

  it('pickWeighted returns the requested count of unique numbers', () => {
    const weights = new Map([[1, 10], [2, 1], [3, 1]]);
    const picked = pickWeighted(weights, 2, () => 0);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/weights.test.ts`
Expected: FAIL (`weights.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/lotto/weights.ts
import type { LottoDraw } from './types';

export const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

export function baseWeights(excluded: number[]): Map<number, number> {
  const excludedSet = new Set(excluded);
  const weights = new Map<number, number>();
  for (const n of ALL_NUMBERS) {
    if (!excludedSet.has(n)) weights.set(n, 1);
  }
  return weights;
}

function latestDraw(history: LottoDraw[]): LottoDraw | undefined {
  return [...history].sort((a, b) => b.drawNumber - a.drawNumber)[0];
}

export function frequencyWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  for (const draw of history) {
    for (const n of draw.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 1);
    }
  }
  return weights;
}

export function carryoverWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = latestDraw(history);
  if (latest) {
    for (const n of latest.numbers) {
      if (weights.has(n)) weights.set(n, weights.get(n)! + 5);
    }
  }
  return weights;
}

export function coldWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
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

export function neighborWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = latestDraw(history);
  if (latest) {
    for (const base of latest.numbers) {
      for (const delta of [-2, -1, 1, 2]) {
        const n = base + delta;
        if (weights.has(n)) weights.set(n, weights.get(n)! + 2);
      }
    }
  }
  return weights;
}

export function sameLastDigitWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = baseWeights(excluded);
  const latest = latestDraw(history);
  if (latest) {
    const digits = new Set(latest.numbers.map((n) => n % 10));
    for (const n of ALL_NUMBERS) {
      if (weights.has(n) && digits.has(n % 10)) {
        weights.set(n, weights.get(n)! + 3);
      }
    }
  }
  return weights;
}

export function mergeWeights(sources: [Map<number, number>, number][]): Map<number, number> {
  const merged = new Map<number, number>();
  for (const [weights, multiplier] of sources) {
    for (const [num, w] of weights) {
      merged.set(num, (merged.get(num) ?? 0) + w * multiplier);
    }
  }
  return merged;
}

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
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/weights.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/weights.ts lib/lotto/weights.test.ts
git commit -m "feat: add atomic weight source functions"
```

## Task 2: `types.ts` — 혼합 전략 id/메타데이터로 갱신

**Files:**
- Modify: `lib/lotto/types.ts`

**Interfaces:**
- Produces: `Strategy = 'frequency' | 'elite' | 'balanced' | 'cold' | 'random'`, `StrategyMeta { id, icon, label, formula }`, `STRATEGIES: StrategyMeta[]` — Task 3, 4, 8, 10이 사용.

- [ ] **Step 1: 파일 수정**

`lib/lotto/types.ts` 전체를 다음으로 교체:

```ts
export type Strategy = 'frequency' | 'elite' | 'balanced' | 'cold' | 'random';

export interface StrategyMeta {
  id: Strategy;
  icon: string;
  label: string;
  formula: string;
}

export const STRATEGIES: StrategyMeta[] = [
  { id: 'frequency', icon: '🔵', label: '빈도 기반', formula: '빈도 + 이월수 + 이웃수 + 동끝수' },
  { id: 'elite', icon: '🏆', label: '엘리트 집중', formula: '빈도×3 + 이월수×3 + Cold×2' },
  { id: 'balanced', icon: '⚖️', label: '균형 조합', formula: '홀짝 3:3 + 구간 균등배분' },
  { id: 'cold', icon: '❄️', label: '미출현 역추세', formula: '미출현 상위 25수 역추세 조합' },
  { id: 'random', icon: '🔀', label: '종합 랜덤', formula: '5개 기법 균등 가중 랜덤' },
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
git commit -m "feat: redefine strategy types as mixed-technique profiles"
```

## Task 3: 혼합 전략 조합 (`lib/lotto/profiles.ts`)

**Files:**
- Create: `lib/lotto/profiles.ts`
- Test: `lib/lotto/profiles.test.ts`

**Interfaces:**
- Consumes: `weights.ts`의 모든 함수, `LottoDraw`, `Strategy` from `types.ts`
- Produces: `frequencyProfileWeights`, `eliteProfileWeights`, `randomProfileWeights`, `coldProfilePool`, `getProfileWeights(strategy, history, excluded)`, `PROFILE_PICKERS: Record<Strategy, ProfilePicker>` — Task 4(strategies.ts), Task 6(analysis.ts)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lotto/profiles.test.ts
import { describe, it, expect } from 'vitest';
import { PROFILE_PICKERS, getProfileWeights } from './profiles';
import type { LottoDraw, Strategy } from './types';

const history: LottoDraw[] = [
  { drawNumber: 2, date: '2025-12-01', numbers: [10, 20, 30, 40, 5, 15], bonusNumber: 25 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
];

describe('PROFILE_PICKERS', () => {
  const strategies: Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];

  it('each profile picker returns the requested count of unique, non-excluded numbers', () => {
    for (const strategy of strategies) {
      const picked = PROFILE_PICKERS[strategy](history, [1, 2, 3], 6, [], Math.random);
      expect(picked).toHaveLength(6);
      expect(new Set(picked).size).toBe(6);
      for (const n of picked) {
        expect([1, 2, 3]).not.toContain(n);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
    }
  });

  it('respects a smaller remainingCount when numbers are already included', () => {
    const picked = PROFILE_PICKERS.frequency(history, [], 2, [7, 8, 9], Math.random);
    expect(picked).toHaveLength(2);
    expect(picked).not.toContain(7);
  });
});

describe('getProfileWeights', () => {
  it('returns a weight map covering non-excluded numbers for every strategy', () => {
    const strategies: Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];
    for (const strategy of strategies) {
      const weights = getProfileWeights(strategy, history, [1]);
      expect(weights.has(1)).toBe(false);
      expect(weights.has(2)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/profiles.test.ts`
Expected: FAIL (`profiles.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/lotto/profiles.ts
import {
  ALL_NUMBERS,
  baseWeights,
  frequencyWeights,
  carryoverWeights,
  coldWeights,
  neighborWeights,
  sameLastDigitWeights,
  mergeWeights,
  pickWeighted,
} from './weights';
import type { LottoDraw, Strategy } from './types';

export type ProfilePicker = (
  history: LottoDraw[],
  poolExcluded: number[],
  remainingCount: number,
  included: number[],
  rng: () => number,
) => number[];

export function frequencyProfileWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  return mergeWeights([
    [frequencyWeights(history, excluded), 1],
    [carryoverWeights(history, excluded), 1],
    [neighborWeights(history, excluded), 1],
    [sameLastDigitWeights(history, excluded), 1],
  ]);
}

export function eliteProfileWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  return mergeWeights([
    [frequencyWeights(history, excluded), 3],
    [carryoverWeights(history, excluded), 3],
    [coldWeights(history, excluded), 2],
  ]);
}

export function randomProfileWeights(history: LottoDraw[], excluded: number[]): Map<number, number> {
  return mergeWeights([
    [frequencyWeights(history, excluded), 1],
    [carryoverWeights(history, excluded), 1],
    [coldWeights(history, excluded), 1],
    [neighborWeights(history, excluded), 1],
    [sameLastDigitWeights(history, excluded), 1],
  ]);
}

export function coldProfilePool(history: LottoDraw[], excluded: number[]): Map<number, number> {
  const weights = coldWeights(history, excluded);
  const top25 = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  return new Map(top25);
}

function balancedPicker(
  _history: LottoDraw[],
  poolExcluded: number[],
  remainingCount: number,
  included: number[],
  rng: () => number,
): number[] {
  const excludedSet = new Set(poolExcluded);
  const pool = ALL_NUMBERS.filter((n) => !excludedSet.has(n));

  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidate = shuffled.slice(0, remainingCount);
    if (candidate.length < remainingCount) return candidate;

    const merged = [...included, ...candidate];
    const oddCount = merged.filter((n) => n % 2 === 1).length;
    const lowCount = merged.filter((n) => n <= 22).length;

    if (oddCount >= 2 && oddCount <= 4 && lowCount >= 2 && lowCount <= 4) {
      return candidate;
    }
  }

  return pool.slice(0, remainingCount);
}

export const PROFILE_PICKERS: Record<Strategy, ProfilePicker> = {
  frequency: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(frequencyProfileWeights(history, poolExcluded), remainingCount, rng),
  elite: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(eliteProfileWeights(history, poolExcluded), remainingCount, rng),
  balanced: balancedPicker,
  cold: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(coldProfilePool(history, poolExcluded), remainingCount, rng),
  random: (history, poolExcluded, remainingCount, _included, rng) =>
    pickWeighted(randomProfileWeights(history, poolExcluded), remainingCount, rng),
};

export function getProfileWeights(strategy: Strategy, history: LottoDraw[], excluded: number[]): Map<number, number> {
  switch (strategy) {
    case 'frequency':
      return frequencyProfileWeights(history, excluded);
    case 'elite':
      return eliteProfileWeights(history, excluded);
    case 'balanced':
      return baseWeights(excluded);
    case 'cold':
      return coldProfilePool(history, excluded);
    case 'random':
      return randomProfileWeights(history, excluded);
  }
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/profiles.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/profiles.ts lib/lotto/profiles.test.ts
git commit -m "feat: add mixed strategy profile compositions"
```

## Task 4: `strategies.ts` 재작성 — 프로필 기반 디스패처 + 포함번호 지원

**Files:**
- Modify: `lib/lotto/strategies.ts` (전체 교체)
- Modify: `lib/lotto/strategies.test.ts` (전체 교체 — 전략 id 변경 반영)

**Interfaces:**
- Consumes: `PROFILE_PICKERS` from `lib/lotto/profiles.ts`
- Produces: `normalizeIncluded(included, excluded): number[]`, `generateByStrategy(strategy, history, excluded, rng?, included?): number[]` — 기존 시그니처 앞부분 불변, `included`는 5번째(신규) 인자로 추가. Task 5(generate.ts), Task 10(UI)이 사용.

- [ ] **Step 1: 실패하는 테스트로 교체**

`lib/lotto/strategies.test.ts` 전체를 다음으로 교체:

```ts
import { describe, it, expect } from 'vitest';
import { generateByStrategy, normalizeIncluded } from './strategies';
import type { LottoDraw, Strategy } from './types';

const history: LottoDraw[] = [
  { drawNumber: 3, date: '2026-01-01', numbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 },
  { drawNumber: 2, date: '2025-12-01', numbers: [1, 2, 3, 10, 11, 12], bonusNumber: 13 },
  { drawNumber: 1, date: '2025-11-01', numbers: [1, 40, 41, 42, 43, 44], bonusNumber: 45 },
];

describe('generateByStrategy', () => {
  it('returns 6 unique numbers between 1 and 45 for every strategy', () => {
    const strategies: Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];
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

  it('always includes the provided included numbers', () => {
    const included = [20, 21, 22];
    const result = generateByStrategy('elite', history, [], Math.random, included);
    for (const n of included) {
      expect(result).toContain(n);
    }
    expect(result).toHaveLength(6);
  });
});

describe('normalizeIncluded', () => {
  it('deduplicates, validates range, and caps at 5 numbers', () => {
    const result = normalizeIncluded([1, 1, 2, 3, 4, 5, 6, 0, 46], []);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('drops numbers that are also excluded', () => {
    const result = normalizeIncluded([1, 2, 3], [2]);
    expect(result).toEqual([1, 3]);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/strategies.test.ts`
Expected: FAIL (`normalizeIncluded` 미존재, 기존 `generateByStrategy`가 새 전략 id를 모름)

- [ ] **Step 3: 구현 작성**

`lib/lotto/strategies.ts` 전체를 다음으로 교체:

```ts
import { PROFILE_PICKERS } from './profiles';
import type { LottoDraw, Strategy } from './types';

export function normalizeIncluded(included: number[], excluded: number[]): number[] {
  const excludedSet = new Set(excluded);
  const seen = new Set<number>();
  const result: number[] = [];

  for (const n of included) {
    if (Number.isInteger(n) && n >= 1 && n <= 45 && !excludedSet.has(n) && !seen.has(n)) {
      seen.add(n);
      result.push(n);
      if (result.length >= 5) break;
    }
  }

  return result;
}

export function generateByStrategy(
  strategy: Strategy,
  history: LottoDraw[],
  excluded: number[],
  rng: () => number = Math.random,
  included: number[] = [],
): number[] {
  const validIncluded = normalizeIncluded(included, excluded);
  const poolExcluded = [...new Set([...excluded, ...validIncluded])];
  const remainingCount = 6 - validIncluded.length;

  if (remainingCount <= 0) {
    return [...validIncluded].sort((a, b) => a - b).slice(0, 6);
  }

  const picked = PROFILE_PICKERS[strategy](history, poolExcluded, remainingCount, validIncluded, rng);
  return [...validIncluded, ...picked].sort((a, b) => a - b);
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/strategies.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/strategies.ts lib/lotto/strategies.test.ts
git commit -m "feat: rewrite strategy dispatcher to use mixed profiles and support included numbers"
```

## Task 5: `generate.ts` — 포함 번호 인자 전달

**Files:**
- Modify: `lib/lotto/generate.ts`
- Modify: `lib/lotto/generate.test.ts` (테스트 추가, 기존 테스트 유지)

**Interfaces:**
- Consumes: `generateByStrategy(strategy, history, excluded, rng, included)` from `lib/lotto/strategies.ts`
- Produces: `generateUniqueGames(strategy, gameCount, excluded, history, rng?, included?): GeneratedGame[]` — 기존 4개 위치 인자 불변, `included`는 6번째(신규) 인자. Task 10(UI)이 사용.

- [ ] **Step 1: 실패하는 테스트 추가**

`lib/lotto/generate.test.ts`에 다음 테스트를 추가 (기존 2개 테스트는 그대로 둠):

```ts
  it('every generated game contains all included numbers', () => {
    const games = generateUniqueGames('random', 3, [], history, Math.random, [9, 18, 27]);
    for (const g of games) {
      expect(g.numbers).toEqual(expect.arrayContaining([9, 18, 27]));
    }
  });
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/generate.test.ts`
Expected: FAIL (`generateUniqueGames`가 `included`를 무시함)

- [ ] **Step 3: 구현 수정**

```ts
// lib/lotto/generate.ts
import { generateByStrategy } from './strategies';
import type { GeneratedGame, LottoDraw, Strategy } from './types';

export function generateUniqueGames(
  strategy: Strategy,
  gameCount: number,
  excluded: number[],
  history: LottoDraw[],
  rng: () => number = Math.random,
  included: number[] = [],
): GeneratedGame[] {
  const seen = new Set<string>();
  const games: GeneratedGame[] = [];
  const maxAttempts = gameCount * 50 + 100;

  for (let attempt = 0; attempt < maxAttempts && games.length < gameCount; attempt++) {
    const raw = generateByStrategy(strategy, history, excluded, rng, included);
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
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/generate.ts lib/lotto/generate.test.ts
git commit -m "feat: thread included numbers through game set generation"
```

## Task 6: 번호별 특징 태그 + 후보군 산출 (`lib/lotto/analysis.ts`)

**Files:**
- Create: `lib/lotto/analysis.ts`
- Test: `lib/lotto/analysis.test.ts`

**Interfaces:**
- Consumes: `ALL_NUMBERS` from `weights.ts`; `frequencyProfileWeights`, `eliteProfileWeights`, `randomProfileWeights`, `coldProfilePool` from `profiles.ts`; `LottoDraw` from `types.ts`
- Produces: `NumberActivity`, `computeActivity(weights): NumberActivity[]`, `getFeatureTags(history, number): string[]`, `getPrimaryCandidates(history, excluded): number[]`, `getSpreadCandidates(history, excluded): number[]`, `getFinalCandidates(history, excluded): { number: number; tags: string[] }[]` — Task 10(UI)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lotto/analysis.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeActivity,
  getFeatureTags,
  getPrimaryCandidates,
  getSpreadCandidates,
  getFinalCandidates,
} from './analysis';
import type { LottoDraw } from './types';

const history: LottoDraw[] = Array.from({ length: 24 }, (_, i) => ({
  drawNumber: 24 - i,
  date: `2025-01-${String(i + 1).padStart(2, '0')}`,
  numbers: i === 0 ? [10, 20, 30, 40, 5, 15] : [1, 2, 3, i % 6 === 0 ? 12 : 44, 43, 42],
  bonusNumber: 7,
})) as LottoDraw[];

describe('computeActivity', () => {
  it('normalizes weights into a 0..1 score for all 45 numbers', () => {
    const weights = new Map([[1, 10], [2, 5]]);
    const activity = computeActivity(weights);
    expect(activity).toHaveLength(45);
    const one = activity.find((a) => a.number === 1)!;
    const two = activity.find((a) => a.number === 2)!;
    expect(one.score).toBeGreaterThan(two.score);
    for (const a of activity) {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(1);
    }
  });
});

describe('getFeatureTags', () => {
  it('tags a number that appeared in the latest draw as carryover', () => {
    const tags = getFeatureTags(history, 10);
    expect(tags).toContain('이월수 (직전 회차 재출현)');
  });

  it('falls back to a neutral tag when nothing else applies', () => {
    const tags = getFeatureTags(history, 33);
    expect(tags.length).toBeGreaterThan(0);
  });
});

describe('candidate pools', () => {
  it('primary and spread candidates return 12 unique numbers each', () => {
    const primary = getPrimaryCandidates(history, []);
    const spread = getSpreadCandidates(history, []);
    expect(new Set(primary).size).toBe(12);
    expect(new Set(spread).size).toBe(12);
  });

  it('final candidates return 8 numbers each with at least one feature tag', () => {
    const final = getFinalCandidates(history, []);
    expect(final).toHaveLength(8);
    for (const c of final) {
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/lotto/analysis.test.ts`
Expected: FAIL (`analysis.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/lotto/analysis.ts
import { ALL_NUMBERS, baseWeights } from './weights';
import { frequencyProfileWeights, eliteProfileWeights, randomProfileWeights, coldProfilePool } from './profiles';
import type { LottoDraw } from './types';

export interface NumberActivity {
  number: number;
  score: number;
}

export function computeActivity(weights: Map<number, number>): NumberActivity[] {
  const values = [...weights.values()];
  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const range = max - min || 1;

  return ALL_NUMBERS.map((n) => ({
    number: n,
    score: weights.has(n) ? (weights.get(n)! - min) / range : 0,
  }));
}

function latestDraw(history: LottoDraw[]): LottoDraw | undefined {
  return [...history].sort((a, b) => b.drawNumber - a.drawNumber)[0];
}

export function getFeatureTags(history: LottoDraw[], number: number): string[] {
  const latest = latestDraw(history);
  const tags: string[] = [];
  if (!latest) return ['구간 균등 분포 후보'];

  if (latest.numbers.includes(number)) {
    tags.push('이월수 (직전 회차 재출현)');
  }

  let nearestBase: number | null = null;
  let nearestDist = Infinity;
  for (const base of latest.numbers) {
    const dist = Math.abs(base - number);
    if (dist > 0 && dist <= 2 && dist < nearestDist) {
      nearestDist = dist;
      nearestBase = base;
    }
  }
  if (nearestBase !== null) {
    tags.push(`직전 ${nearestBase}번의 ±${nearestDist} 근접수`);
  }

  const sameDigitBase = latest.numbers.find((base) => base !== number && base % 10 === number % 10);
  if (sameDigitBase !== undefined) {
    tags.push(`직전 ${sameDigitBase}번과 끝수 ${number % 10} 동일 (동끝수)`);
  }

  const recent = [...history].sort((a, b) => b.drawNumber - a.drawNumber).slice(0, 24);
  const recentCount = recent.filter((draw) => draw.numbers.includes(number)).length;
  if (recentCount >= 2 && recentCount <= 4) {
    tags.push(`최근 24회 빈도 ${recentCount}회`);
  }

  if (tags.length === 0) {
    tags.push('구간 균등 분포 후보');
  }

  return tags.slice(0, 2);
}

function topN(weights: Map<number, number>, n: number): number[] {
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([num]) => num);
}

export function getPrimaryCandidates(history: LottoDraw[], excluded: number[]): number[] {
  return topN(frequencyProfileWeights(history, excluded), 12);
}

export function getSpreadCandidates(history: LottoDraw[], excluded: number[]): number[] {
  const rankMaps = [
    frequencyProfileWeights(history, excluded),
    eliteProfileWeights(history, excluded),
    baseWeights(excluded),
    coldProfilePool(history, excluded),
  ];

  const rankScore = new Map<number, number>();
  for (const weights of rankMaps) {
    const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]);
    ranked.forEach(([num], index) => {
      rankScore.set(num, (rankScore.get(num) ?? 0) + (ranked.length - index));
    });
  }

  return topN(rankScore, 12);
}

export function getFinalCandidates(
  history: LottoDraw[],
  excluded: number[],
): { number: number; tags: string[] }[] {
  const spread = getSpreadCandidates(history, excluded);
  const weights = randomProfileWeights(history, excluded);

  return spread
    .map((number) => ({ number, weight: weights.get(number) ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map(({ number }) => ({ number, tags: getFeatureTags(history, number) }));
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/lotto/analysis.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/analysis.ts lib/lotto/analysis.test.ts
git commit -m "feat: add per-number feature tags and candidate pool analysis"
```

## Task 7: `useLatestDraw` 훅 추출 + `LatestDraw.tsx` 리팩터

**Files:**
- Create: `lib/lotto/useLatestDraw.ts`
- Modify: `components/lotto/LatestDraw.tsx`

**Interfaces:**
- Produces: `useLatestDraw(): { draw: LottoDraw; source: 'live' | 'cache' } | null` — Task 10(page.tsx의 DetailedDisclaimer 연동)이 사용.

- [ ] **Step 1: 훅 파일 작성**

```ts
// lib/lotto/useLatestDraw.ts
'use client';

import { useEffect, useState } from 'react';
import type { LottoDraw } from './types';

export interface LatestDrawResult {
  draw: LottoDraw;
  source: 'live' | 'cache';
}

export function useLatestDraw(): LatestDrawResult | null {
  const [data, setData] = useState<LatestDrawResult | null>(null);

  useEffect(() => {
    fetch('/api/lotto/latest')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return data;
}
```

- [ ] **Step 2: `LatestDraw.tsx`를 훅을 쓰도록 수정**

`components/lotto/LatestDraw.tsx` 전체를 다음으로 교체:

```tsx
'use client';

import { NumberBall } from './NumberBall';
import { useLatestDraw } from '@/lib/lotto/useLatestDraw';

export function LatestDraw() {
  const data = useLatestDraw();

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

- [ ] **Step 3: 개발 서버로 회귀 확인**

Run: `npm run dev`, `http://localhost:3000` 접속.
Expected: 직전 회차 정보가 이전과 동일하게 표시됨(외부 동작 변화 없음).

- [ ] **Step 4: 커밋**

```bash
git add lib/lotto/useLatestDraw.ts components/lotto/LatestDraw.tsx
git commit -m "refactor: extract latest-draw fetch into a reusable hook"
```

## Task 8: 신규 프레젠테이션 컴포넌트 묶음

**Files:**
- Create: `components/lotto/StrategyCard.tsx`
- Create: `components/lotto/IncludeNumbersInput.tsx`
- Create: `components/lotto/AlgorithmSummaryCard.tsx`
- Create: `components/lotto/CandidatePoolList.tsx`
- Create: `components/lotto/FinalCandidateCard.tsx`
- Create: `components/lotto/DetailedDisclaimer.tsx`
- Modify: `components/lotto/GameResultCard.tsx` (선택적 `showStats` prop 추가)

**Interfaces:**
- Consumes: `StrategyMeta`, `GeneratedGame` from `lib/lotto/types.ts`; `NumberBall` from `./NumberBall`
- Produces: 아래 각 컴포넌트 — Task 10(page.tsx)이 사용.

- [ ] **Step 1: `StrategyCard.tsx` 작성**

```tsx
'use client';

import type { Strategy, StrategyMeta } from '@/lib/lotto/types';

export function StrategyCard({
  strategy,
  selected,
  onSelect,
}: {
  strategy: StrategyMeta;
  selected: boolean;
  onSelect: (id: Strategy) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(strategy.id)}
      aria-pressed={selected}
      className={`w-full text-left border rounded-lg p-3 flex items-center gap-3 ${
        selected ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200'
      }`}
    >
      <span className="text-xl" aria-hidden="true">
        {strategy.icon}
      </span>
      <span>
        <span className="block font-semibold text-sm">{strategy.label}</span>
        <span className="block text-xs text-gray-500">{strategy.formula}</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 2: `IncludeNumbersInput.tsx` 작성**

```tsx
'use client';

export function IncludeNumbersInput({
  value,
  onChange,
  excluded,
}: {
  value: string;
  onChange: (v: string) => void;
  excluded: number[];
}) {
  const included = value
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
  const overLimit = included.length > 5;
  const overlap = included.filter((n) => excluded.includes(n));

  return (
    <div>
      <h2 className="font-semibold mb-2">포함 번호 (최대 5개, 쉼표로 구분)</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="예: 6, 36"
      />
      {overLimit && (
        <p className="text-sm text-red-500 mt-1">포함 번호는 최대 5개까지 선택할 수 있습니다.</p>
      )}
      {overlap.length > 0 && (
        <p className="text-sm text-red-500 mt-1">제외 번호와 겹칩니다: {overlap.join(', ')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `AlgorithmSummaryCard.tsx` 작성**

```tsx
import type { StrategyMeta } from '@/lib/lotto/types';

export function AlgorithmSummaryCard({ strategy }: { strategy: StrategyMeta }) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50" aria-label={`적용 알고리즘: ${strategy.label}, ${strategy.formula}`}>
      <h3 className="font-semibold text-sm mb-1">적용 알고리즘 요약</h3>
      <p className="text-sm text-gray-600">
        {strategy.icon} {strategy.label} — {strategy.formula}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: `CandidatePoolList.tsx` 작성**

```tsx
import { NumberBall } from './NumberBall';

export function CandidatePoolList({
  title,
  description,
  numbers,
}: {
  title: string;
  description: string;
  numbers: number[];
}) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="flex flex-wrap gap-1" aria-label={`${title}: ${numbers.join(', ')}번`}>
        {numbers.map((n) => (
          <NumberBall key={n} n={n} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `FinalCandidateCard.tsx` 작성**

```tsx
import { NumberBall } from './NumberBall';

export function FinalCandidateCard({ number, tags }: { number: number; tags: string[] }) {
  return (
    <div className="flex items-center gap-3 border rounded-lg p-2" aria-label={`${number}번, 특징: ${tags.join(', ')}`}>
      <NumberBall n={number} />
      <ul className="text-xs text-gray-600 list-disc list-inside">
        {tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: `DetailedDisclaimer.tsx` 작성**

```tsx
export function DetailedDisclaimer({ drawNumber, date }: { drawNumber: number; date: string }) {
  return (
    <p className="text-xs text-gray-500 border-t pt-3 mt-4 leading-relaxed">
      본 분석은 통계 기반 참고 정보입니다(기준 회차: {drawNumber}회, {date}). 실제 결과와 차이가 있을 수 있으며
      당첨을 보장하지 않습니다. 로또는 1~45 중 6개를 무작위로 추첨하는 완전 확률 게임이며, 과거 패턴이 미래
      결과를 예측하지 않습니다. 본 정보는 재미를 위한 통계이며 투자·도박 조언이 아닙니다. 정확한 당첨 결과는{' '}
      <a
        href="https://www.dhlottery.co.kr"
        className="underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        동행복권(dhlottery.co.kr)
      </a>
      에서 확인하세요.
    </p>
  );
}
```

- [ ] **Step 7: `GameResultCard.tsx`에 `showStats` prop 추가**

`components/lotto/GameResultCard.tsx` 전체를 다음으로 교체 (기존 클립보드 복사 동작은 그대로 유지):

```tsx
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
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-6">{index + 1}</span>
        <div className="flex gap-1">
          {game.numbers.map((n) => (
            <NumberBall key={n} n={n} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showStats && (
          <span className="text-xs text-gray-400 hidden sm:inline">
            합 {sum} · 홀{oddCount}짝{6 - oddCount}
          </span>
        )}
        <button onClick={handleCopy} className="text-sm px-3 py-1 rounded border hover:bg-gray-50" type="button">
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: 커밋**

```bash
git add components/lotto/StrategyCard.tsx components/lotto/IncludeNumbersInput.tsx components/lotto/AlgorithmSummaryCard.tsx components/lotto/CandidatePoolList.tsx components/lotto/FinalCandidateCard.tsx components/lotto/DetailedDisclaimer.tsx components/lotto/GameResultCard.tsx
git commit -m "feat: add strategy card, include-numbers input, and analysis panel components"
```

## Task 9: 활성도 막대그래프 (`components/lotto/ActivityChart.tsx`)

**Files:**
- Create: `components/lotto/ActivityChart.tsx`

**Interfaces:**
- Consumes: `NumberActivity` from `lib/lotto/analysis.ts`

- [ ] **Step 1: dataviz 스킬 가이드 확인**

이 컴포넌트를 작성하기 전에 `dataviz` 스킬을 먼저 호출해 팔레트/폼 가이드를 확인한다 (프로젝트 규칙 — 차트 작성 전 필수).

- [ ] **Step 2: 컴포넌트 작성**

```tsx
'use client';

import type { NumberActivity } from '@/lib/lotto/analysis';

function colorFor(n: number): string {
  if (n <= 15) return 'bg-yellow-400';
  if (n <= 30) return 'bg-blue-400';
  return 'bg-red-400';
}

export function ActivityChart({
  activity,
  highlighted = [],
}: {
  activity: NumberActivity[];
  highlighted?: number[];
}) {
  const highlightedSet = new Set(highlighted);

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-3">번호별 활성도 분포 (1~45)</h3>
      <div
        className="flex items-end gap-[2px] h-32"
        role="img"
        aria-label="번호별 활성도 막대그래프. 막대가 높을수록 선택한 전략에서 가중치가 높은 번호입니다."
      >
        {activity.map(({ number, score }) => (
          <div
            key={number}
            className="flex-1 h-full flex flex-col justify-end"
            aria-label={`${number}번 활성도 ${Math.round(score * 100)}퍼센트${
              highlightedSet.has(number) ? ', 최종 조합 후보 포함' : ''
            }`}
          >
            <div
              className={`w-full rounded-t ${highlightedSet.has(number) ? 'bg-indigo-500' : colorFor(number)}`}
              style={{ height: `${Math.max(score * 100, 4)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>1</span>
        <span>15</span>
        <span>30</span>
        <span>45</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add components/lotto/ActivityChart.tsx
git commit -m "feat: add activity bar chart component"
```

## Task 10: `app/generator/page.tsx` 전체 재구성 — 반응형 2열 레이아웃

**Files:**
- Modify: `app/generator/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1~9에서 만든 모든 함수/컴포넌트

- [ ] **Step 1: 파일 전체 교체**

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

  const excluded = excludedInput
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);

  const includedRaw = includedInput
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
  const included = normalizeIncluded(includedRaw, excluded);

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

          {mode === 'count' && latest && <DetailedDisclaimer drawNumber={latest.draw.drawNumber} date={latest.draw.date} />}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 개발 서버 기동 후 데스크톱 뷰포트 수동 검증**

Run: `npm run dev`, `http://localhost:3000/generator` 접속 (브라우저 폭 1200px 이상).
Expected: 좌측 컬럼(전략 카드 5개, 세트수/예산 토글, 제외/포함 번호, 생성 버튼), 우측 컬럼(직전회차, 알고리즘 요약, 활성도 차트, 생성 버튼 클릭 후 결과+합계/홀짝, "종합 랜덤" 선택 시 후보군 3단계)이 2열로 나란히 표시됨.

- [ ] **Step 3: 모바일 뷰포트 수동 검증**

브라우저 폭을 375px로 좁히거나 Playwright `page.set_viewport_size({"width": 375, "height": 800})`로 확인.
Expected: 모든 요소가 1열로 세로 정렬되고 가로 스크롤이 발생하지 않음.

- [ ] **Step 4: 포함 번호 동작 확인**

"포함 번호"에 `1, 2, 3`을 입력하고 세트수 3, 아무 전략으로 생성.
Expected: 생성된 모든 게임에 1, 2, 3이 포함됨. 6개를 입력하면 "최대 5개까지" 경고가 뜨고 5개까지만 반영됨.

- [ ] **Step 5: F2(예산 모드)가 리치 패널 없이 기존대로 동작하는지 확인**

"예산으로 선택" 클릭.
Expected: 알고리즘 요약/활성도 차트/후보군 패널이 보이지 않고, 기존처럼 프리셋+총액·게임수+접기펼치기만 표시됨.

- [ ] **Step 6: 커밋**

```bash
git add app/generator/page.tsx
git commit -m "feat: rebuild F1 generator page with responsive rich analysis layout"
```

## Task 11: 전체 검증 + 문서 갱신

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS (weights 7, profiles 3, strategies 5, generate 3, budget 5, history 1, analysis 6 = 30개).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: Playwright로 데스크톱/모바일 시나리오 재확인**

기존에 사용한 Playwright 스크립트 패턴으로 `/generator`를 데스크톱(1280×800)과 모바일(375×800) 뷰포트 각각에서 스크린샷을 찍어 레이아웃 확인. 5가지 전략 전환, 종합 랜덤에서 후보군 3단계 노출, 다른 전략에서는 후보군이 숨겨지는지 확인.

- [ ] **Step 4: `docs/PLAN.md`를 이번 계획으로 갱신**

`docs/PLAN.md`는 Notion Documents PRD/PLAN sync 소스다. `docs/superpowers/plans/2026-07-10-f1-rich-ui-redesign.md`의 최종 내용(구현 완료 후)을 반영하도록 `docs/PLAN.md`를 갱신한다.

```bash
cp docs/superpowers/plans/2026-07-10-f1-rich-ui-redesign.md docs/PLAN.md
git add docs/PLAN.md
git commit -m "docs: sync PLAN.md with F1 rich UI redesign implementation"
```

- [ ] **Step 5: Notion Documents 본문 동기화 (선택, 1회)**

```bash
py .notion/scripts/sync_notion_documents.py prd plan
```

Expected: Notion의 PRD/PLAN 페이지 본문이 `docs/PRD.md`/`docs/PLAN.md` 최신 내용으로 갱신됨.

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F1 rich UI redesign tests, lint, and build pass" --allow-empty
```

---

## Self-Review 메모

- **PRD 커버리지**: F1의 신규 AC(혼합 전략 카드, 세트수, 제외/포함번호, 합계·홀짝, 알고리즘 요약, 활성도 차트, 종합랜덤 한정 후보군 3단계+최종조합후보 8개, 클립보드 복사, 직전회차, 상세면책조항, 반응형, 접근성) 전부 Task 1~10에서 구현. F2는 Task 5(엔진 공유)만 영향받고 UI는 무변경.
- **F5 원칙 준수**: 별점/순위/점수/"AI"/"추천" 라벨을 어디에도 쓰지 않음(`FinalCandidateCard`는 특징 태그만 표시). 특징 태그는 전부 `getFeatureTags`의 실제 이력 계산에서 나옴.
- **`elite` 이중가중치 해결**: `random` 프로필은 4개 전략이 아닌 원자 소스 5개(frequency/carryover/cold/neighbor/sameLastDigit) 균등 평균으로 확정(Task 3).
- **하위 호환**: `generateByStrategy`/`generateUniqueGames`는 기존 위치 인자를 그대로 두고 끝에 `included`만 추가해 F2/budget.ts 호출부를 건드리지 않음.
- **F6 마이그레이션**: PRD가 언급한 `carryover`→새 id 마이그레이션은 F6(최근 생성 이력)이 아직 구현되지 않아 저장된 값이 없으므로 이번 스코프에서는 해당 없음(N/A) — F6 구현 시점에 다시 검토.
