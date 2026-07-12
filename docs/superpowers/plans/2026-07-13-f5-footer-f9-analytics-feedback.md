# F5 공용 푸터 + F9 Analytics/마이크로피드백 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F5의 "하단 푸터 상시 노출"과 F9의 "Vercel Analytics 사용 데이터 수집", "(선택) 마이크로 피드백 👍/👎" 세 항목을 구현해 1단계 MVP 체크리스트의 남은 작은 항목들을 마무리한다.

**Architecture:** 기존 홈페이지에만 있던 인라인 footer를 공용 `Footer` 컴포넌트로 추출해 루트 레이아웃에 적용한다(F5의 `FirstVisitNotice`와 동일하게 레이아웃 레벨 적용). `@vercel/analytics`의 Next.js 전용 `<Analytics />` 컴포넌트로 페이지뷰를 자동 수집하고, 번호 생성 시점에 `track()`으로 커스텀 이벤트 하나(`generate`)를 보낸다. 마이크로 피드백은 별도 백엔드 없이 같은 `track()` 인프라를 재사용해 클릭을 집계하고, `sessionStorage`로 세션당 1회 투표만 허용한다.

**Tech Stack:** 기존과 동일 (Next.js App Router, TS, Tailwind) + 신규 의존성 `@vercel/analytics`.

## Global Constraints

- 푸터 문구는 기존 문구 그대로 정확히 사용한다: "이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다."
- 푸터는 `app/layout.tsx`(루트 레이아웃)에 적용해 `/`, `/generator`, `/stats` 모든 화면에 공통 노출한다. `app/page.tsx`의 기존 인라인 `<footer>`는 제거해 중복시키지 않는다.
- Analytics 커스텀 이벤트명은 `generate`(속성 `{ mode: 'count' | 'budget' }`)와 `feedback_thumbs`(속성 `{ value: 'up' | 'down' }`) 두 개로 고정한다. 이벤트명을 늘리지 않는다.
- 개인 식별 정보는 어떤 이벤트에도 포함하지 않는다(번호 자체, 전략, 모드, 투표값 정도만).
- 마이크로 피드백 문구는 "이 조합 어때요?"이며, 결과 화면당(개별 조합 카드가 아니라) 한 번만 노출한다.
- 마이크로 피드백의 세션당 재투표 방지는 `sessionStorage` 키 `lotto-feedback-voted`로 구현한다.
- 이 작업 범위에는 구글폼 피드백 링크를 포함하지 않는다(사용자가 명시적으로 제외 요청).
- Footer/MicroFeedback 컴포넌트는 로직이 단순한 UI라 이 코드베이스의 다른 UI 컴포넌트들과 동일하게 자동화 단위테스트 없이 수동 브라우저 검증으로 확인한다(참고: `vitest.config.ts`의 `include`가 `lib/**/*.test.ts`로 한정되어 있어 애초에 `components/`는 테스트 대상이 아니다).

---

## Task 1: 공용 Footer 컴포넌트 + 루트 레이아웃 적용

**Files:**
- Create: `components/lotto/Footer.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `Footer()` — props 없는 컴포넌트, `app/layout.tsx`가 사용.

- [ ] **Step 1: Footer 컴포넌트 작성**

```tsx
// components/lotto/Footer.tsx
export function Footer() {
  return (
    <footer className="text-xs text-gray-400 text-center py-6 border-t">
      이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
    </footer>
  );
}
```

- [ ] **Step 2: 루트 레이아웃에 적용**

`app/layout.tsx`를 다음으로 교체 (기존 `FirstVisitNotice` import/사용은 그대로 유지하고 `Footer` import와 `{children}` 아래 `<Footer />`만 추가):

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FirstVisitNotice } from "@/components/lotto/FirstVisitNotice";
import { Footer } from "@/components/lotto/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "로또 미니앱",
  description: "번호 생성기, 예산 기반 생성 등 재미로 즐기는 로또 미니앱입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <FirstVisitNotice />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 홈페이지의 중복 인라인 footer 제거**

`app/page.tsx`에서 아래 블록을 찾아:

```tsx
      <Disclaimer />
      <footer className="text-xs text-gray-400 pt-8 border-t">
        이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
      </footer>
    </main>
```

다음으로 교체(footer 제거, `<Disclaimer />`와 `</main>`만 남김):

```tsx
      <Disclaimer />
    </main>
```

- [ ] **Step 4: 개발 서버로 수동 검증**

Run: `npm run dev`

Expected:
- `http://localhost:3000/`, `/generator`, `/stats` 세 경로 모두에서 페이지 최하단에 "이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다." 문구가 보인다.
- 홈페이지(`/`)에 문구가 중복으로 두 번 나오지 않는다(한 번만 보여야 함).

- [ ] **Step 5: 커밋**

```bash
git add components/lotto/Footer.tsx app/layout.tsx app/page.tsx
git commit -m "feat: add shared footer with legal disclaimer to root layout"
```

## Task 2: Vercel Analytics 연동 (페이지뷰 + 생성 이벤트)

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `app/layout.tsx`
- Modify: `app/generator/page.tsx`

**Interfaces:**
- Consumes: `@vercel/analytics/next`의 `Analytics` 컴포넌트, `@vercel/analytics`의 `track(eventName, properties)` 함수.
- Produces: 없음 (다른 태스크가 이 값을 소비하지 않음).

- [ ] **Step 1: 패키지 설치**

Run: `npm install @vercel/analytics`

- [ ] **Step 2: 루트 레이아웃에 Analytics 컴포넌트 추가**

`app/layout.tsx`의 import 목록에 아래를 추가:

```tsx
import { Analytics } from "@vercel/analytics/next";
```

`<body>` 내부, `<Footer />` 바로 다음에 추가:

```tsx
      <body className="min-h-full">
        <FirstVisitNotice />
        {children}
        <Footer />
        <Analytics />
      </body>
```

- [ ] **Step 3: 번호 생성 시 커스텀 이벤트 전송**

`app/generator/page.tsx` 상단 import 목록에 추가:

```tsx
import { track } from '@vercel/analytics';
```

`handleGenerate` 함수를 아래로 교체(맨 앞에 `track` 호출 한 줄 추가):

```tsx
  function handleGenerate() {
    track('generate', { mode });
    const gameCount = mode === 'budget' ? budgetInfo.gameCount : count;
    const newGames = generateUniqueGames(strategy, gameCount, excluded, history, Math.random, included);
    setGames(newGames);
    if (mode === 'count') {
      addGames(newGames, strategy);
    }
  }
```

- [ ] **Step 4: 타입체크 + 빌드로 확인**

Run: `npx tsc --noEmit && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 5: 개발 서버로 수동 검증**

Run: `npm run dev`, `/generator` 접속 후 브라우저 개발자도구 콘솔 확인.

Expected:
- 콘솔에 `[Vercel Web Analytics]` 관련 로그(개발 모드에서는 실제 전송 대신 디버그 로그만 출력되는 것이 정상 동작)가 보이거나 에러가 없다.
- "번호 생성하기" 버튼 클릭 시 콘솔/네트워크 탭에 에러가 발생하지 않는다.
- 실제 이벤트 집계 확인은 프로덕션 배포 후 Vercel 대시보드의 Analytics 탭에서 한다(로컬 개발 모드는 전송하지 않는 것이 `@vercel/analytics`의 기본 동작).

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json app/layout.tsx app/generator/page.tsx
git commit -m "feat: add Vercel Analytics with generate event tracking"
```

## Task 3: 마이크로 피드백 (👍/👎)

**Files:**
- Create: `components/lotto/MicroFeedback.tsx`
- Modify: `app/generator/page.tsx`

**Interfaces:**
- Consumes: `track` from `@vercel/analytics` (Task 2에서 설치됨).
- Produces: `MicroFeedback()` — props 없는 컴포넌트, `app/generator/page.tsx`가 사용.

- [ ] **Step 1: MicroFeedback 컴포넌트 작성**

```tsx
// components/lotto/MicroFeedback.tsx
'use client';

import { useEffect, useState } from 'react';
import { track } from '@vercel/analytics';

const STORAGE_KEY = 'lotto-feedback-voted';

export function MicroFeedback() {
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    // sessionStorage isn't available during server rendering, so this check can only
    // happen client-side after mount — the resulting setState is an intentional,
    // one-time sync with that browser-only API, not a derivable render value.
    if (sessionStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoted(true);
    }
  }, []);

  function handleVote(value: 'up' | 'down') {
    track('feedback_thumbs', { value });
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVoted(true);
  }

  if (voted) {
    return (
      <div className="rounded-xl bg-white shadow-sm p-4">
        <p className="text-sm text-gray-500">감사합니다! 소중한 의견 반영할게요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm p-4 flex items-center justify-between">
      <p className="text-sm text-gray-700">이 조합 어때요?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleVote('up')}
          className="text-lg px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          aria-label="좋아요"
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => handleVote('down')}
          className="text-lg px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          aria-label="별로예요"
        >
          👎
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 생성기 결과 화면에 배치**

`app/generator/page.tsx` 상단 import 목록에 추가(다른 `components/lotto/*` import들 근처):

```tsx
import { MicroFeedback } from '@/components/lotto/MicroFeedback';
```

아래 블록을 찾아:

```tsx
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

다음으로 교체(`<Disclaimer />` 다음 줄에 `<MicroFeedback />` 추가):

```tsx
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
              <MicroFeedback />
            </div>
          )}
```

- [ ] **Step 3: 개발 서버로 수동 검증**

Run: `npm run dev`, 브라우저 개발자도구 콘솔에서 `sessionStorage.clear()` 실행 후 `/generator` 접속, "번호 생성하기" 클릭.

Expected:
- 결과 목록 하단, 면책조항 아래에 "이 조합 어때요?" 문구와 👍/👎 버튼이 보인다.
- 👍 또는 👎 클릭 시 버튼 영역이 "감사합니다! 소중한 의견 반영할게요."로 바뀐다.
- 같은 세션에서 다시 "번호 생성하기"를 눌러도 감사 문구 상태가 유지된다(다시 투표 버튼이 뜨지 않음).
- 개발자도구 콘솔에서 `sessionStorage.getItem('lotto-feedback-voted')`를 실행하면 `"1"`이 반환된다.
- `sessionStorage.clear()` 후 새로고침하면 다시 투표 버튼이 보인다.

- [ ] **Step 4: 커밋**

```bash
git add components/lotto/MicroFeedback.tsx app/generator/page.tsx
git commit -m "feat: add thumbs up/down micro-feedback to generator results"
```

## Task 4: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행 (회귀 확인)**

Run: `npm run test`
Expected: 기존 테스트 전부 PASS (이번 작업은 신규 자동화 테스트를 추가하지 않으므로 개수는 이전과 동일, 42개).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F5 footer and F9 analytics/feedback tests, lint, and build pass" --allow-empty
```
