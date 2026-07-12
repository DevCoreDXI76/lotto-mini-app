# F5: 최초 진입 안내 모달 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱에 처음 방문한 사용자에게 1회만 법적 안내 문구를 모달로 보여주고, 이후 재방문 시에는 다시 노출하지 않는다.

**Architecture:** `localStorage` 플래그로 노출 여부를 추적하는 클라이언트 컴포넌트 하나(`FirstVisitNotice`)를 만들어 루트 레이아웃(`app/layout.tsx`)에서 항상 렌더링한다. 서버 렌더링 시에는 항상 숨김 상태로 시작하고, 마운트 후 `useEffect`에서 `localStorage`를 확인해 필요할 때만 보이도록 해 하이드레이션 불일치를 피한다.

**Tech Stack:** 기존과 동일 (Next.js App Router, TS, Tailwind).

## Global Constraints

- 모달 문구는 PRD F5 AC 그대로 정확히 사용한다: "이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다."
- localStorage 키 이름은 `lotto-first-visit-seen`으로 고정한다.
- "확인" 버튼을 눌러야만 닫힌다 — 백드롭 클릭이나 ESC로는 닫히지 않는다.
- 루트 레이아웃(`app/layout.tsx`)에 적용해, 홈이 아닌 다른 페이지(`/generator`, `/stats`)로 처음 들어와도 동일하게 1회 노출되도록 한다.
- 기존 카드 스타일(`bg-white rounded-xl shadow-sm`)을 재사용해 앱 전체 톤을 유지한다.
- 이 컴포넌트는 로직이 없는 순수 프레젠테이션이라, 이 코드베이스의 다른 UI 컴포넌트들과 동일하게 자동화 단위테스트 없이 수동 브라우저 검증으로 확인한다.

---

## Task 1: `FirstVisitNotice` 컴포넌트 작성 + 루트 레이아웃 적용

**Files:**
- Create: `components/lotto/FirstVisitNotice.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `FirstVisitNotice()` — props 없는 컴포넌트, `app/layout.tsx`가 사용.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// components/lotto/FirstVisitNotice.tsx
'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lotto-first-visit-seen';

export function FirstVisitNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function handleConfirm() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="최초 방문 안내"
        className="w-full max-w-sm rounded-xl bg-white shadow-sm p-6 space-y-4"
      >
        <p className="text-sm text-gray-700">
          이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-black text-white rounded-lg py-2 font-semibold"
        >
          확인
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 루트 레이아웃에 적용**

`app/layout.tsx` 전체를 다음으로 교체:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FirstVisitNotice } from "@/components/lotto/FirstVisitNotice";
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
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 개발 서버로 수동 검증**

Run: `npm run dev`, 브라우저 개발자도구 콘솔에서 `localStorage.clear()` 실행 후 `http://localhost:3000`(또는 `/generator`, `/stats` 중 아무 경로나) 접속.

Expected:
- 페이지 로드 직후 어두운 백드롭과 함께 "이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다." 모달이 중앙에 표시된다.
- 백드롭을 클릭해도 닫히지 않는다.
- "확인" 버튼 클릭 시 모달이 사라진다.
- 같은 브라우저 세션에서 새로고침(F5)하거나 다른 경로(`/generator`, `/stats`)로 이동해도 모달이 다시 뜨지 않는다.
- 개발자도구 콘솔에서 `localStorage.getItem('lotto-first-visit-seen')`을 실행하면 `"1"`이 반환된다.
- 다시 `localStorage.clear()` 후 새로고침하면 모달이 재노출된다.

- [ ] **Step 4: 커밋**

```bash
git add components/lotto/FirstVisitNotice.tsx app/layout.tsx
git commit -m "feat: add first-visit legal notice modal to root layout"
```

## Task 2: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행 (회귀 확인)**

Run: `npm run test`
Expected: 기존 테스트 전부 PASS (이번 작업은 신규 테스트를 추가하지 않으므로 개수는 이전과 동일).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F5 first-visit notice tests, lint, and build pass" --allow-empty
```
