# Phase 1 후속 작업 (검증 → 콘텐츠 보강 → 회차별 페이지) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/PHASE1-TRADEOFFS.md`가 인계한 미검증 워킹 트리 변경을 검증·커밋하고, Phase 1a에 남은 SEO 콘텐츠(설명문/FAQ/광고 슬롯)를 채우고, `/result/[회차번호]` 프로그래매틱 SEO 페이지를 구현해 애드센스 신청 가능한 상태를 만든다.

**Architecture:** 기존 `lib/lotto/*` 계산 로직과 `data/lotto-full-history.json`을 그대로 재사용한다. 신규 로직은 회차 상세 페이지에 필요한 `drawInsights.ts` 하나뿐이다. 신규 페이지는 모두 서버 컴포넌트 + `generateStaticParams`로 빌드 타임 정적 생성한다.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2, TypeScript, Vitest, Tailwind CSS 4.

## Global Constraints

- 브랜드명은 `로또랩(LottoLab)` 확정. 신규 코드에서 브랜드명 하드코딩 금지 — 항상 `lib/site.ts`의 `SITE_NAME`/`SITE_URL`을 사용한다.
- 도메인은 `lotto-mini-app-three.vercel.app` 유지가 제안 단계다(최종 확정 아님, `PHASE1-TRADEOFFS.md` 1.3). 이 계획의 어떤 작업도 도메인 변경을 전제하지 않는다.
- 텔레그램 봇(`lib/telegram/api.ts`)의 "로또 미니앱" 문구는 **건드리지 않는다** — 웹만 로또랩으로 전환하는 것으로 잠정 확정됐으나 사용자 최종 확인 전이라(`PHASE1-TRADEOFFS.md` 1.6), 이 계획에 포함하지 않았다.
- 회차별 상세 페이지는 "회차 번호 + 당첨번호"만 나열하면 안 되고, 반드시 페이지마다 실제로 계산된 고유 정보(홀짝 비율, 번호 합계, 직전 회차 대비 변화)를 자동 삽입한다 — Google의 "scaled content abuse" 정책 대응이자 `PROJECT-CHARTER.md` 3.3절 요건이다.
- F5 법적 안전장치 원칙(당첨 보장 암시 금지, 우열 표현 금지)을 신규 페이지에도 그대로 적용한다 — 기존 `Disclaimer` 컴포넌트를 재사용하고 새로 작성하지 않는다.
- 광고 슬롯은 지금 실제 광고 코드 없이 반응형 자리만 예약한다(Core Web Vitals 흔들림 방지, `PROJECT-CHARTER.md` 3.4절).
- `AGENTS.md`: 이 저장소의 Next.js(16.2.10)는 학습 데이터 시점과 다를 수 있는 빌드다. 이번 계획에서 사용하는 API(`sitemap.ts`/`robots.ts`의 `MetadataRoute`, 동적 라우트의 `params: Promise<...>`)는 `node_modules/next/dist/docs/`와 이미 대조 확인했다 — 각각 [file-conventions/metadata/sitemap.md](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md), [file-conventions/metadata/robots.md](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md), [file-conventions/page.md](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md) 참고. 새 API를 추가로 쓰게 되면 반드시 먼저 해당 문서를 확인한다.

---

### Task 1: 워킹 트리 검증 및 커밋

`docs/PHASE1-TRADEOFFS.md` 0절 인계 사항. 아래 10개 파일이 이미 워킹 트리에 있고(`git status`로 확인 완료, 문서 기술과 일치), 검증된 적이 없다.

**Files:**
- Modify(이미 워킹 트리에 있음, 새로 만들지 않음): `app/generator/page.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/stats/page.tsx`, `app/stores/page.tsx`
- 신규(이미 워킹 트리에 있음): `app/generator/GeneratorClient.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/stores/StoresClient.tsx`, `lib/site.ts`

**Interfaces:**
- Produces: `SITE_NAME: string`, `SITE_URL: string` (from `lib/site.ts`) — Task 2, 3, 4에서 재사용.

- [ ] **Step 1: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 0건. 에러가 나오면 해당 파일을 고쳐서 통과시킨다(에러를 억제하는 `@ts-ignore`나 `any` 캐스팅으로 우회하지 않는다).

- [ ] **Step 2: 린트**

Run: `npm run lint`
Expected: 에러 0건. `GeneratorClient.tsx`/`StoresClient.tsx`가 `'use client'`로 시작하는데도 서버 전용 API를 쓰고 있지 않은지 특히 확인.

- [ ] **Step 3: 유닛 테스트**

Run: `npm run test`
Expected: 기존 테스트 전부 PASS. `app/generator/page.tsx`나 `app/stores/page.tsx`를 default import하는 테스트가 있다면(이름이 바뀐 컴포넌트를 참조), 새 파일 경로/이름(`GeneratorClient`, `StoresClient`)으로 import를 갱신한다.

- [ ] **Step 4: 빌드**

Run: `npm run build`
Expected: 빌드 성공. 특히 `app/sitemap.ts`/`app/robots.ts`가 `/sitemap.xml`, `/robots.txt` 라우트로 정상 생성되는지 빌드 로그의 라우트 목록에서 확인한다.

- [ ] **Step 5: 문제 없으면 의미 단위로 3개 커밋으로 분리**

```bash
git add lib/site.ts app/layout.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
feat: rebrand site to 로또랩(LottoLab) with centralized site constants

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"

git add app/generator/page.tsx app/generator/GeneratorClient.tsx app/stores/page.tsx app/stores/StoresClient.tsx
git commit -m "$(cat <<'EOF'
refactor: split /generator and /stores into server (metadata) + client components

'use client' pages cannot export metadata, so each page's client logic
moved to a sibling XxxClient.tsx and the page.tsx became a thin server
component that only owns page-specific Metadata.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"

git add app/stats/page.tsx app/sitemap.ts app/robots.ts
git commit -m "$(cat <<'EOF'
feat: add per-page metadata, sitemap.xml, and robots.txt

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 재사용 가능한 FAQ/광고 슬롯 컴포넌트

4개 페이지 전부에서 쓸 아코디언 FAQ와 광고 자리 컴포넌트를 먼저 만든다(Task 3에서 각 페이지가 소비함).

**Files:**
- Create: `components/lotto/Faq.tsx`
- Create: `components/lotto/AdSlot.tsx`
- Test: `components/lotto/Faq.test.tsx`

**Interfaces:**
- Produces: `Faq({ items }: { items: { q: string; a: string }[] })` — Task 3에서 4개 페이지가 이 시그니처로 소비.
- Produces: `AdSlot({ slot }: { slot: string })` — Task 3에서 각 페이지 하단에 배치.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// components/lotto/Faq.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Faq } from './Faq';

describe('Faq', () => {
  const items = [
    { q: '질문 1', a: '답변 1' },
    { q: '질문 2', a: '답변 2' },
  ];

  it('renders all questions but hides answers by default', () => {
    render(<Faq items={items} />);
    expect(screen.getByText('질문 1')).toBeInTheDocument();
    expect(screen.queryByText('답변 1')).not.toBeInTheDocument();
  });

  it('reveals an answer when its question is clicked', () => {
    render(<Faq items={items} />);
    fireEvent.click(screen.getByText('질문 1'));
    expect(screen.getByText('답변 1')).toBeInTheDocument();
    expect(screen.queryByText('답변 2')).not.toBeInTheDocument();
  });
});
```

> `@testing-library/react`가 아직 devDependency에 없다면 `npm install -D @testing-library/react @testing-library/jest-dom jsdom`을 먼저 실행하고, `vitest.config.ts`의 `test.environment`가 `jsdom`인지 확인한다(현재 프로젝트에 컴포넌트 렌더 테스트가 없다면 이 설정 자체가 없을 수 있음 — 없으면 추가).

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run components/lotto/Faq.test.tsx`
Expected: FAIL — `Cannot find module './Faq'`

- [ ] **Step 3: 최소 구현**

```tsx
// components/lotto/Faq.tsx
'use client';

import { useState } from 'react';

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm divide-y">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q} className="p-4">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="w-full text-left text-sm font-semibold flex justify-between items-center"
              aria-expanded={open}
            >
              {item.q}
              <span className="text-gray-400">{open ? '−' : '+'}</span>
            </button>
            {open && <p className="text-sm text-gray-600 mt-2">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
```

```tsx
// components/lotto/AdSlot.tsx
export function AdSlot({ slot }: { slot: string }) {
  return (
    <div
      data-ad-slot={slot}
      className="w-full min-h-[100px] flex items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400"
      aria-hidden="true"
    >
      광고 영역
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/lotto/Faq.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add components/lotto/Faq.tsx components/lotto/Faq.test.tsx components/lotto/AdSlot.tsx
git commit -m "$(cat <<'EOF'
feat: add reusable Faq accordion and AdSlot placeholder components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 4개 페이지에 설명문 + FAQ + 광고 슬롯 삽입

Phase 1a 잔여 항목(`PHASE1-TRADEOFFS.md` 3절 2번, `PROJECT-CHARTER.md` 3.3절). 위젯은 그대로 두고 서버 컴포넌트인 각 `page.tsx`에 크롤링 가능한 설명 텍스트를 추가한다.

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/generator/page.tsx`
- Modify: `app/stats/page.tsx`
- Modify: `app/stores/page.tsx`

**Interfaces:**
- Consumes: `Faq` from `components/lotto/Faq.tsx`, `AdSlot` from `components/lotto/AdSlot.tsx` (Task 2).

- [ ] **Step 1: `app/generator/page.tsx` 수정**

```tsx
import type { Metadata } from 'next';
import { GeneratorClient } from './GeneratorClient';
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

export const metadata: Metadata = {
  title: '로또 번호 생성기',
  description:
    '통계 기반 5가지 전략(빈도/엘리트/균형/Cold/랜덤)으로 로또 번호를 무료로 생성하세요. 세트 수 또는 예산에 맞춰 조합을 만들고 최근 회차 활성도까지 확인할 수 있습니다.',
};

const FAQ_ITEMS = [
  {
    q: '생성된 번호가 당첨을 보장하나요?',
    a: '아닙니다. 로또랩의 번호 생성기는 과거 당첨 데이터를 통계적으로 분석해 후보를 제시할 뿐이며, 실제 추첨에서는 어떤 조합이든 당첨 확률이 동일합니다.',
  },
  {
    q: '5가지 전략 중 어떤 걸 선택해야 하나요?',
    a: '정해진 정답은 없습니다. 최근 출현 흐름을 중시한다면 빈도 기반이나 엘리트 집중을, 특정 패턴에 치우치지 않길 원한다면 균형 조합을, 역발상 접근을 원한다면 미출현 역추세를 선택하면 됩니다.',
  },
  {
    q: '예산 기반 생성은 어떻게 작동하나요?',
    a: '입력한 예산을 1게임당 1,000원 기준으로 나눠 최대로 생성 가능한 게임 수를 계산한 뒤, 선택한 전략에 맞춰 그만큼의 조합을 채워줍니다.',
  },
];

export default function GeneratorPage() {
  return (
    <>
      <section className="max-w-xl mx-auto px-6 pt-6 text-sm text-gray-600">
        <p>
          로또랩 번호 생성기는 역대 로또 6/45 당첨번호를 분석해 빈도·이월수·이웃수·동끝수 등의
          통계 기법으로 번호 조합을 만들어 드립니다. 세트 수를 직접 정하거나 예산에 맞춰 최대한
          많은 게임을 한 번에 생성할 수 있습니다.
        </p>
      </section>
      <GeneratorClient />
      <div className="max-w-xl mx-auto px-6 space-y-6 pb-6">
        <AdSlot slot="generator-bottom" />
        <Faq items={FAQ_ITEMS} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: `app/stats/page.tsx` 수정** — 기존 마크업은 유지하고 설명문/FAQ/광고 슬롯만 추가

```tsx
// app/stats/page.tsx 상단 import에 추가
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

// STATS_FAQ_ITEMS 상수 추가 (컴포넌트 밖)
const STATS_FAQ_ITEMS = [
  {
    q: '이 통계로 다음 회차 당첨번호를 예측할 수 있나요?',
    a: '아닙니다. 로또 추첨은 매 회차 독립적인 확률 사건이라 과거 출현 빈도가 미래 당첨을 예측하지 않습니다. 이 페이지는 과거 데이터를 정리해 보여드릴 뿐입니다.',
  },
  {
    q: '순위는 얼마나 자주 바뀌나요?',
    a: '매주 새 회차 추첨 결과가 반영될 때마다 출현 횟수가 갱신되며, 그에 따라 순위도 조금씩 바뀔 수 있습니다.',
  },
];

// return문의 <main> 안, 기존 <p className="text-sm text-gray-500">...당첨을 예측하지 않습니다.</p> 바로 다음에 추가
      <AdSlot slot="stats-bottom" />
      <Faq items={STATS_FAQ_ITEMS} />
```

- [ ] **Step 3: `app/stores/page.tsx` 수정**

```tsx
import type { Metadata } from 'next';
import { StoresClient } from './StoresClient';
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

export const metadata: Metadata = {
  title: '로또 판매점 찾기',
  description:
    '내 주변 로또 판매점을 지도와 리스트로 찾아보고, 1등 당첨 이력이 확인된 판매점을 함께 확인하세요.',
};

const STORES_FAQ_ITEMS = [
  {
    q: '1등 배출 이력이 있는 판매점에서 사면 당첨 확률이 높아지나요?',
    a: '아닙니다. 판매량이 많은 판매점일수록 통계적으로 1등 배출 건수가 누적되기 쉬울 뿐, 특정 판매점에서 구매한다고 당첨 확률 자체가 올라가지 않습니다.',
  },
  {
    q: '판매점 정보는 얼마나 자주 갱신되나요?',
    a: '현재 목록은 최근 갱신 시점 기준 스냅샷이며, 폐업하거나 새로 생긴 판매점이 즉시 반영되지 않을 수 있습니다.',
  },
];

export default function StoresPage() {
  return (
    <>
      <StoresClient />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4 pb-6">
        <AdSlot slot="stores-bottom" />
        <Faq items={STORES_FAQ_ITEMS} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: `app/page.tsx` 수정** — `<Disclaimer />` 앞에 삽입

```tsx
// import 추가
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

// 컴포넌트 밖에 상수 추가
const HOME_FAQ_ITEMS = [
  {
    q: '로또랩은 무료인가요?',
    a: '네, 번호 생성기·통계·판매점 찾기 모두 회원가입이나 결제 없이 무료로 이용할 수 있습니다.',
  },
  {
    q: '로또랩에서 로또를 직접 구매할 수 있나요?',
    a: '아니요. 로또랩은 번호 생성·통계·판매점 안내만 제공하며, 복권 판매나 구매 대행은 하지 않습니다.',
  },
];

// <StoreFinderLink /> 다음, <Disclaimer /> 이전에 삽입
      <AdSlot slot="home-bottom" />
      <Faq items={HOME_FAQ_ITEMS} />
```

- [ ] **Step 5: 검증 및 커밋**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: 전부 통과.

```bash
git add app/page.tsx app/generator/page.tsx app/stats/page.tsx app/stores/page.tsx
git commit -m "$(cat <<'EOF'
feat: add SEO copy, FAQ, and ad slot placeholders to all 4 pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 회차별 상세 페이지 계산 로직 (`drawInsights`)

`PHASE1-TRADEOFFS.md` 2절 리스크 대응 — 회차 페이지마다 실제로 다른 값(홀짝 비율, 합계, 직전 회차 대비)을 자동 계산해 넣기 위한 순수 함수. `lib/lotto/analysis.ts`/`weights.ts`와 같은 위치에 둔다.

**Files:**
- Create: `lib/lotto/drawInsights.ts`
- Test: `lib/lotto/drawInsights.test.ts`

**Interfaces:**
- Consumes: `LottoDraw` (from `lib/lotto/types.ts`)
- Produces: `computeDrawInsight(draw: LottoDraw, previous: LottoDraw | undefined): DrawInsight` — Task 5의 `/result/[drawNumber]` 페이지가 이 시그니처로 소비.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lotto/drawInsights.test.ts
import { describe, expect, it } from 'vitest';
import { computeDrawInsight } from './drawInsights';
import type { LottoDraw } from './types';

const draw1231: LottoDraw = {
  drawNumber: 1231,
  date: '2026-07-04',
  numbers: [4, 13, 14, 18, 31, 38],
  bonusNumber: 15,
};

const draw1230: LottoDraw = {
  drawNumber: 1230,
  date: '2026-06-27',
  numbers: [3, 8, 9, 22, 30, 45],
  bonusNumber: 1,
};

describe('computeDrawInsight', () => {
  it('counts odd and even numbers', () => {
    const insight = computeDrawInsight(draw1231, undefined);
    expect(insight.oddCount).toBe(2); // 13, 31
    expect(insight.evenCount).toBe(4); // 4, 14, 18, 38
  });

  it('computes sum and average', () => {
    const insight = computeDrawInsight(draw1231, undefined);
    expect(insight.sum).toBe(4 + 13 + 14 + 18 + 31 + 38);
    expect(insight.average).toBeCloseTo(118 / 6, 5);
  });

  it('returns null diff when there is no previous draw', () => {
    const insight = computeDrawInsight(draw1231, undefined);
    expect(insight.sumDiffFromPrevious).toBeNull();
  });

  it('computes sum diff against the previous draw', () => {
    const insight = computeDrawInsight(draw1231, draw1230);
    const sum1231 = 4 + 13 + 14 + 18 + 31 + 38;
    const sum1230 = 3 + 8 + 9 + 22 + 30 + 45;
    expect(insight.sumDiffFromPrevious).toBe(sum1231 - sum1230);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run lib/lotto/drawInsights.test.ts`
Expected: FAIL — `Cannot find module './drawInsights'`

- [ ] **Step 3: 구현**

```ts
// lib/lotto/drawInsights.ts
import type { LottoDraw } from './types';

export interface DrawInsight {
  oddCount: number;
  evenCount: number;
  sum: number;
  average: number;
  sumDiffFromPrevious: number | null;
}

function sumOf(draw: LottoDraw): number {
  return draw.numbers.reduce((total, n) => total + n, 0);
}

export function computeDrawInsight(draw: LottoDraw, previous: LottoDraw | undefined): DrawInsight {
  const oddCount = draw.numbers.filter((n) => n % 2 === 1).length;
  const sum = sumOf(draw);

  return {
    oddCount,
    evenCount: draw.numbers.length - oddCount,
    sum,
    average: sum / draw.numbers.length,
    sumDiffFromPrevious: previous ? sum - sumOf(previous) : null,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/lotto/drawInsights.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/lotto/drawInsights.ts lib/lotto/drawInsights.test.ts
git commit -m "$(cat <<'EOF'
feat: add computeDrawInsight for per-draw odd/even, sum, and prior-draw diff

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `/result/[drawNumber]` 상세 페이지

`PHASE1-TRADEOFFS.md`/`PHASE1-EXECUTION-PLAN.md`가 공통으로 지정한 URL 구조. `generateStaticParams`로 전체 1,231개 회차를 빌드 타임 정적 생성한다(`data/lotto-full-history.json` 기준, 회차 수는 데이터 갱신 때마다 자동으로 늘어남).

**Files:**
- Create: `app/result/[drawNumber]/page.tsx`
- Test: `app/result/[drawNumber]/page.test.tsx` (`computeDrawInsight` 호출 배선만 검증하는 게 아니라, 존재하지 않는 회차 접근 시 `notFound()`가 호출되는지가 핵심 대상)

**Interfaces:**
- Consumes: `computeDrawInsight` (Task 4), `Disclaimer` (`components/lotto/Disclaimer.tsx`, 기존), `NumberBall` (`components/lotto/NumberBall.tsx`, 기존), `SITE_NAME`/`SITE_URL` (`lib/site.ts`, Task 1).
- Produces: 라우트 `/result/[drawNumber]` — Task 6의 인덱스 페이지와 사이트맵이 이 경로 패턴으로 링크.

- [ ] **Step 1: 페이지 구현**

```tsx
// app/result/[drawNumber]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeDrawInsight } from '@/lib/lotto/drawInsights';
import { NumberBall } from '@/components/lotto/NumberBall';
import { Disclaimer } from '@/components/lotto/Disclaimer';

const history = fullHistory as LottoDraw[];
const byDrawNumber = new Map(history.map((draw) => [draw.drawNumber, draw]));

export function generateStaticParams() {
  return history.map((draw) => ({ drawNumber: String(draw.drawNumber) }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ drawNumber: string }>;
}): Promise<Metadata> {
  const { drawNumber } = await params;
  const draw = byDrawNumber.get(Number(drawNumber));
  if (!draw) return {};

  return {
    title: `로또 ${draw.drawNumber}회 당첨번호`,
    description: `${draw.date} 추첨된 로또 ${draw.drawNumber}회 당첨번호, 보너스번호, 홀짝 비율, 번호 합계와 직전 회차 대비 변화를 확인하세요.`,
  };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ drawNumber: string }>;
}) {
  const { drawNumber } = await params;
  const draw = byDrawNumber.get(Number(drawNumber));
  if (!draw) notFound();

  const previous = byDrawNumber.get(draw.drawNumber - 1);
  const insight = computeDrawInsight(draw, previous);
  const hasPrevious = byDrawNumber.has(draw.drawNumber - 1);
  const hasNext = byDrawNumber.has(draw.drawNumber + 1);

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">로또 {draw.drawNumber}회 당첨번호</h1>
        <p className="text-sm text-gray-500 mt-1">{draw.date} 추첨</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-2">
        {draw.numbers.map((n) => (
          <NumberBall key={n} n={n} />
        ))}
        <span className="text-gray-400 px-1">+</span>
        <NumberBall n={draw.bonusNumber} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-1 text-sm text-gray-600">
        <p>
          홀수 {insight.oddCount}개 · 짝수 {insight.evenCount}개
        </p>
        <p>
          번호 합계 {insight.sum} (평균 {insight.average.toFixed(1)})
        </p>
        {insight.sumDiffFromPrevious !== null && (
          <p>
            직전 {draw.drawNumber - 1}회 대비 합계{' '}
            {insight.sumDiffFromPrevious > 0
              ? `+${insight.sumDiffFromPrevious}`
              : insight.sumDiffFromPrevious}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        {hasPrevious ? (
          <Link href={`/result/${draw.drawNumber - 1}`} className="text-blue-600 underline">
            ← {draw.drawNumber - 1}회
          </Link>
        ) : (
          <span />
        )}
        <Link href="/result" className="text-gray-500 underline">
          전체 회차 목록
        </Link>
        {hasNext ? (
          <Link href={`/result/${draw.drawNumber + 1}`} className="text-blue-600 underline">
            {draw.drawNumber + 1}회 →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <Link href="/stats" className="block text-sm text-gray-500 underline">
        역대 통계 전체 보기 →
      </Link>

      <Disclaimer />
    </main>
  );
}
```

- [ ] **Step 2: 존재하지 않는 회차 처리 테스트**

```tsx
// app/result/[drawNumber]/page.test.tsx
import { describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));

const { default: ResultPage } = await import('./page');

describe('ResultPage', () => {
  it('calls notFound() for a draw number that does not exist in the data', async () => {
    await expect(
      ResultPage({ params: Promise.resolve({ drawNumber: '999999' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run "app/result/[drawNumber]/page.test.tsx"`
Expected: PASS

- [ ] **Step 4: 빌드로 정적 생성 확인**

Run: `npm run build`
Expected: 빌드 로그의 라우트 목록에 `/result/[drawNumber]`가 나오고, 데이터 파일의 회차 수(현재 1,231개)만큼 정적 페이지가 생성됐다는 안내가 나온다. 빌드 시간이 눈에 띄게 길어지면(수 분 이상) 이 스텝에서 실제 소요 시간을 기록해 Task 7에서 페이지네이션/증분 생성 여부를 재검토할 근거로 남긴다.

- [ ] **Step 5: 커밋**

```bash
git add "app/result/[drawNumber]/page.tsx" "app/result/[drawNumber]/page.test.tsx"
git commit -m "$(cat <<'EOF'
feat: add /result/[drawNumber] programmatic SEO detail page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 회차 목록 인덱스 페이지 (`/result`) + 사이트맵/내부링크 반영

**Files:**
- Create: `app/result/page.tsx`
- Create: `components/lotto/ResultIndexList.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/stats/page.tsx` (Task 3에서 이미 수정된 파일에 링크 한 줄만 추가)

**Interfaces:**
- Consumes: 기존 `StoreListView`의 "N개 더 보기" 증분 페이지네이션 패턴(`components/lotto/StoreListView.tsx`)과 동일한 UX를 따른다.
- Produces: `ResultIndexList({ draws }: { draws: { drawNumber: number; date: string }[] })`.

- [ ] **Step 1: 목록 컴포넌트 구현**

```tsx
// components/lotto/ResultIndexList.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

const PAGE_SIZE = 50;

export function ResultIndexList({ draws }: { draws: { drawNumber: number; date: string }[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = draws.slice(0, visibleCount);
  const remaining = draws.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((draw) => (
        <Link
          key={draw.drawNumber}
          href={`/result/${draw.drawNumber}`}
          className="flex justify-between items-center bg-white rounded-lg shadow-sm px-4 py-3 text-sm hover:shadow"
        >
          <span className="font-semibold">{draw.drawNumber}회</span>
          <span className="text-gray-500">{draw.date}</span>
        </Link>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="w-full text-sm text-gray-500 py-2"
        >
          {remaining}개 더 보기
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 인덱스 페이지 구현**

```tsx
// app/result/page.tsx
import type { Metadata } from 'next';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { ResultIndexList } from '@/components/lotto/ResultIndexList';

export const metadata: Metadata = {
  title: '회차별 당첨번호 전체 목록',
  description: '로또 6/45 역대 전체 회차의 당첨번호를 회차별로 확인하세요.',
};

export default function ResultIndexPage() {
  const history = fullHistory as LottoDraw[];
  const draws = [...history]
    .sort((a, b) => b.drawNumber - a.drawNumber)
    .map((draw) => ({ drawNumber: draw.drawNumber, date: draw.date }));

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">회차별 당첨번호</h1>
      <p className="text-sm text-gray-500">
        최신 회차부터 확인할 수 있습니다. 각 회차를 누르면 홀짝 비율, 번호 합계 등 상세 정보를 볼 수
        있습니다.
      </p>
      <ResultIndexList draws={draws} />
    </main>
  );
}
```

- [ ] **Step 3: `app/sitemap.ts`에 `/result` 및 회차별 경로 반영**

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';

const routes = ['', '/generator', '/stats', '/stores', '/result'];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const history = fullHistory as LottoDraw[];

  const staticEntries = routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const resultEntries = history.map((draw) => ({
    url: `${SITE_URL}/result/${draw.drawNumber}`,
    lastModified: new Date(draw.date),
    changeFrequency: 'never' as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...resultEntries];
}
```

> 회차 결과는 추첨 이후 절대 바뀌지 않으므로 `changeFrequency: 'never'`가 정확하다. 사이트맵 항목이 1,200개를 넘으면(Google 상한은 개당 50,000개라 지금은 여유 있음) `generateSitemaps`로 분할하는 것을 고려하되, 지금 회차 수(1,231)로는 분할이 필요 없다.

- [ ] **Step 4: `/stats`에서 `/result`로 내부링크 추가**

`app/stats/page.tsx`의 `<FullRankingToggle entries={ranking} />` 다음 줄에 추가:

```tsx
      <Link href="/result" className="block text-sm text-gray-500 underline">
        회차별 당첨번호 전체 보기 →
      </Link>
```

(`app/stats/page.tsx` 상단에 `import Link from 'next/link';` 필요 — 현재 파일에 없으면 추가)

- [ ] **Step 5: 검증 및 커밋**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: 전부 통과. 빌드 로그에서 `/sitemap.xml`이 여전히 정상 생성되는지, 사이트맵 항목 수가 늘어난 것을 확인.

```bash
git add app/result/page.tsx components/lotto/ResultIndexList.tsx app/sitemap.ts app/stats/page.tsx
git commit -m "$(cat <<'EOF'
feat: add /result index page, sitemap entries, and /stats cross-link

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 (코드 아님, 수동 체크리스트): 애드센스 신청 준비

`PHASE1-TRADEOFFS.md` 3절 3번, `PROJECT-CHARTER.md` 3.1/3.5절. 코드 작업이 아니라 신청 전 재확인 절차이므로 TDD 대상이 아니다.

- [ ] Google AdSense 공식 최신 요건 페이지를 신청 직전 다시 읽는다(이 계획에 적힌 "20개 콘텐츠, 3개월" 등은 비공식 통설이라 확정치로 쓰지 않는다 — `PHASE1-TRADEOFFS.md` 2절).
- [ ] Search Console 소유권 확인(`SITE_URL` 기준).
- [ ] `/robots.txt`, `/sitemap.xml`이 배포된 프로덕션 도메인에서 실제로 접근 가능한지 확인.
- [ ] 모바일 반응형 기본 점검(생성기/통계/판매점/회차 상세 4종 페이지 모두).
- [ ] 신청.
- [ ] 승인 시: 광고 슬롯(`AdSlot` 컴포넌트가 배치된 4곳 + 신규 `/result` 계열)에 실제 광고 코드 삽입, "민감한 카테고리 차단" 필터링 설정.
- [ ] 반려 시: 반려 사유를 체크리스트로 변환해 재신청 준비.

---

## 실행 전 확인이 필요한 열린 질문 (이 계획 밖)

- **도메인 최종 확정** (`PHASE1-TRADEOFFS.md` 1.3/4): 이 계획은 `lotto-mini-app-three.vercel.app` 유지를 전제로 작성됐다. 도메인을 바꾸기로 하면 `lib/site.ts`의 `SITE_URL` 한 줄만 고치면 되도록 이미 분리돼 있다.
- **텔레그램 브랜드명 통일 여부** (`PHASE1-TRADEOFFS.md` 1.6): `lib/telegram/api.ts`는 이 계획에서 다루지 않았다. 착수 전 사용자에게 다시 확인 필요.
