# F9: 텔레그램 봇 피드백 + 미니앱 진입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 텔레그램 봇으로 들어온 일반 텍스트는 관리자 채팅으로 forward하고 사용자에게 자동 응답하며, `/start` 명령에는 미니앱(생성기) 진입 버튼을 보여준다.

**Architecture:** 별도 서버 없이 기존 Vercel 배포에 웹훅 API 라우트 하나를 추가한다(`app/api/telegram/webhook/route.ts`). 메시지 분류는 순수 함수(`lib/telegram/webhookLogic.ts`)로 분리해 단위테스트하고, Telegram Bot API 호출은 얇은 fetch 래퍼(`lib/telegram/api.ts`)로 감싼다. Vercel Chat SDK 같은 멀티플랫폼 프레임워크는 상태 저장소가 필요 없는 단방향 요청-응답에는 과해서 채택하지 않는다.

**Tech Stack:** 기존과 동일 (Next.js App Router Route Handler, TS, Vitest). 신규 외부 패키지 없음 — Telegram Bot API는 순수 `fetch`로 호출한다.

## Global Constraints

- Telegram Bot API 호출은 `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/<method>`를 순수 `fetch`로 호출한다 — 별도 SDK/패키지를 추가하지 않는다.
- 웹훅 라우트는 `X-Telegram-Bot-Api-Secret-Token` 헤더를 `TELEGRAM_WEBHOOK_SECRET` 환경변수와 대조해 검증하고, 불일치 시 401을 반환한다.
- `/start`(및 `/start@botname` 형태)는 미니앱 진입 버튼 메시지로 응답한다. 다른 `/`로 시작하는 명령어는 무시한다. 그 외 일반 텍스트만 관리자 채팅으로 forward한다.
- 사용자에게 보내는 자동 응답 문구는 정확히: "의견 감사합니다! 검토 후 반영하겠습니다."
- 환경변수 이름은 정확히 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `APP_URL`로 고정한다.
- 실제 봇 토큰이 필요한 검증(진짜 텔레그램에서 메시지 주고받기)은 이 계획의 코딩 태스크에 포함하지 않는다 — 사용자가 소유한 비밀값이 필요하므로 계획 맨 끝의 "배포 후 수동 설정" 절차로 별도 분리한다.

---

## Task 1: 메시지 분류 로직 — `lib/telegram/webhookLogic.ts`

**Files:**
- Create: `lib/telegram/webhookLogic.ts`
- Test: `lib/telegram/webhookLogic.test.ts`

**Interfaces:**
- Produces: `WebhookAction = { type: 'launchMiniApp' } | { type: 'forwardFeedback'; text: string } | { type: 'ignore' }`, `classifyMessage(text: string | undefined): WebhookAction` — Task 3(`route.ts`)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/telegram/webhookLogic.test.ts
import { describe, it, expect } from 'vitest';
import { classifyMessage } from './webhookLogic';

describe('classifyMessage', () => {
  it('classifies /start as launchMiniApp', () => {
    expect(classifyMessage('/start')).toEqual({ type: 'launchMiniApp' });
  });

  it('classifies /start with a bot-username suffix (group chat form) as launchMiniApp', () => {
    expect(classifyMessage('/start@my_bot')).toEqual({ type: 'launchMiniApp' });
  });

  it('classifies other slash commands as ignore', () => {
    expect(classifyMessage('/help')).toEqual({ type: 'ignore' });
  });

  it('classifies plain text as forwardFeedback with the trimmed text', () => {
    expect(classifyMessage('  이 기능 정말 좋아요  ')).toEqual({
      type: 'forwardFeedback',
      text: '이 기능 정말 좋아요',
    });
  });

  it('classifies missing or blank text as ignore', () => {
    expect(classifyMessage(undefined)).toEqual({ type: 'ignore' });
    expect(classifyMessage('   ')).toEqual({ type: 'ignore' });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/telegram/webhookLogic.test.ts`
Expected: FAIL (`webhookLogic.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/telegram/webhookLogic.ts
export type WebhookAction =
  | { type: 'launchMiniApp' }
  | { type: 'forwardFeedback'; text: string }
  | { type: 'ignore' };

export function classifyMessage(text: string | undefined): WebhookAction {
  if (!text) return { type: 'ignore' };
  const trimmed = text.trim();
  if (!trimmed) return { type: 'ignore' };
  if (trimmed.startsWith('/start')) return { type: 'launchMiniApp' };
  if (trimmed.startsWith('/')) return { type: 'ignore' };
  return { type: 'forwardFeedback', text: trimmed };
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/telegram/webhookLogic.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/telegram/webhookLogic.ts lib/telegram/webhookLogic.test.ts
git commit -m "feat: add telegram webhook message classification logic"
```

## Task 2: Telegram API 래퍼 — `lib/telegram/api.ts`

**Files:**
- Create: `lib/telegram/api.ts`

**Interfaces:**
- Produces: `sendTelegramMessage(chatId: number, text: string): Promise<void>`, `sendMiniAppLaunchMessage(chatId: number): Promise<void>` — Task 3(`route.ts`)가 사용.

- [ ] **Step 1: 구현 작성**

```ts
// lib/telegram/api.ts
const TELEGRAM_API_BASE = 'https://api.telegram.org';

function botUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return `${TELEGRAM_API_BASE}/bot${token}/${method}`;
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function sendMiniAppLaunchMessage(chatId: number): Promise<void> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is not set');

  await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: '로또 미니앱에 오신 것을 환영합니다! 아래 버튼으로 바로 번호 생성기를 이용해보세요.',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎲 번호 생성기 열기', web_app: { url: `${appUrl}/generator` } }],
        ],
      },
    }),
  });
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add lib/telegram/api.ts
git commit -m "feat: add telegram bot API wrapper"
```

## Task 3: 웹훅 라우트 — `app/api/telegram/webhook/route.ts`

**Files:**
- Create: `app/api/telegram/webhook/route.ts`

**Interfaces:**
- Consumes: `classifyMessage` from `lib/telegram/webhookLogic.ts`; `sendTelegramMessage`, `sendMiniAppLaunchMessage` from `lib/telegram/api.ts`

- [ ] **Step 1: 라우트 작성**

```ts
// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { classifyMessage } from '@/lib/telegram/webhookLogic';
import { sendTelegramMessage, sendMiniAppLaunchMessage } from '@/lib/telegram/api';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { username?: string; first_name?: string };
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const action = classifyMessage(message.text);

  try {
    if (action.type === 'launchMiniApp') {
      await sendMiniAppLaunchMessage(chatId);
    } else if (action.type === 'forwardFeedback') {
      const adminChatId = Number(process.env.TELEGRAM_ADMIN_CHAT_ID);
      const from = message.from?.username
        ? `@${message.from.username}`
        : (message.from?.first_name ?? '익명');
      await sendTelegramMessage(adminChatId, `📩 피드백 (${from}):\n${action.text}`);
      await sendTelegramMessage(chatId, '의견 감사합니다! 검토 후 반영하겠습니다.');
    }
  } catch (error) {
    console.error('telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 로컬 더미 환경변수로 구조적 검증**

실제 텔레그램 토큰 없이도 라우트의 분기·보안 로직이 올바른지 확인한다. 프로젝트 루트에 `.env.local`(이미 `.gitignore`에 포함되어 커밋되지 않음)을 만들고 더미 값을 채운다:

```
TELEGRAM_BOT_TOKEN=000000:FAKE_TOKEN_FOR_LOCAL_TESTING
TELEGRAM_ADMIN_CHAT_ID=123456789
TELEGRAM_WEBHOOK_SECRET=local-test-secret
APP_URL=http://localhost:3100
```

Run: `npm run dev -- -p 3100` (백그라운드로 실행, 포트 3100이 이미 사용 중이면 `netstat -ano | grep ":3100 "`으로 확인 후 정리)

시크릿 헤더 없이 요청 → 401 확인:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3100/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"chat":{"id":123},"text":"/start"}}'
```
Expected: `401`

올바른 시크릿 + `/start` → 200 확인:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3100/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: local-test-secret" \
  -d '{"message":{"chat":{"id":123},"text":"/start"}}'
```
Expected: `200` (더미 토큰이라 실제 텔레그램 서버는 이 요청을 거부하지만, 우리 라우트 코드는 응답 상태를 확인하지 않고 진행하므로 200을 반환한다 — 이 단계에서는 "올바른 분기를 탔는가"만 확인하면 된다)

올바른 시크릿 + 일반 피드백 텍스트 → 200 확인:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3100/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: local-test-secret" \
  -d '{"message":{"chat":{"id":123},"text":"이 기능 정말 좋아요","from":{"username":"tester"}}}'
```
Expected: `200`

검증 후 개발 서버 프로세스를 종료하고 포트가 해제됐는지 확인한다(Windows에서 `npm run dev` 백그라운드 프로세스가 부모만 죽고 실제 next 서버는 좀비로 남는 경우가 있으므로, `netstat`으로 확인 후 필요하면 `taskkill //F //PID <PID> //T`로 정리).

- [ ] **Step 3: 커밋**

```bash
git add app/api/telegram/webhook/route.ts
git commit -m "feat: add telegram webhook route for feedback forwarding and mini-app launch"
```

## Task 4: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS (기존 테스트 전부 + `webhookLogic.test.ts` 5개 신규).

- [ ] **Step 2: 린트/빌드 확인**

Run: `npm run lint && npm run build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F9 telegram bot tests, lint, and build pass" --allow-empty
```

---

## 배포 후 수동 설정 (사용자 작업 — 코딩 태스크 아님)

이 절차는 사용자 소유의 실제 텔레그램 봇 토큰이 필요해서 에이전트가 대신 실행할 수 없다. 배포(`vercel --prod`) 완료 후 사용자가 직접 수행한다.

1. **환경변수 등록** — 사용자의 터미널에서 직접 실행(토큰이 대화 세션에 노출되지 않도록):
   ```bash
   vercel env add TELEGRAM_BOT_TOKEN production
   vercel env add TELEGRAM_ADMIN_CHAT_ID production
   vercel env add TELEGRAM_WEBHOOK_SECRET production
   vercel env add APP_URL production
   ```
   `TELEGRAM_WEBHOOK_SECRET`은 아무 임의의 긴 문자열이면 된다(예: `openssl rand -hex 32`로 생성). `APP_URL`은 `https://lotto-mini-app-three.vercel.app` (마지막 슬래시 없이).

2. **재배포** — 새 환경변수가 적용되도록 다시 배포한다: `vercel --prod`

3. **웹훅 등록** — 아래 명령의 `<TELEGRAM_BOT_TOKEN>`과 `<TELEGRAM_WEBHOOK_SECRET>`을 실제 값으로 바꿔 1회 실행한다(등록 후 텔레그램이 웹훅으로 업데이트를 보내기 시작한다):
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://lotto-mini-app-three.vercel.app/api/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}'
   ```
   응답에 `"ok":true`가 보이면 성공.

4. **실제 텔레그램에서 확인**:
   - 봇과의 대화에서 `/start` 전송 → "🎲 번호 생성기 열기" 버튼이 있는 환영 메시지가 오는지, 버튼을 누르면 미니앱(생성기 페이지)이 열리는지 확인.
   - 일반 텍스트(예: "테스트 피드백") 전송 → 관리자 채팅으로 발신자 정보와 함께 forward되는지, 보낸 사람에게는 "의견 감사합니다! 검토 후 반영하겠습니다"가 오는지 확인.
