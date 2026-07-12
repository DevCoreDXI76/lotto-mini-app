# F5 공용 푸터 + F9 Analytics/마이크로피드백 Design

## 배경

1단계(MVP) PRD의 F5(법적 안전장치), F9(피드백 수집) 체크리스트 중 아래 3개 항목이 미완료 상태였다.

- F5: "하단 푸터에 동일 문구 상시 노출" — 현재 홈(`/`)에만 `<footer>`가 있고 `/generator`, `/stats`에는 없음.
- F9: Vercel Analytics(또는 동급 무료 분석 도구)로 페이지뷰·주요 버튼 클릭 이벤트 수집 — 미착수.
- F9: (선택) 마이크로 피드백 👍/👎 버튼, 클릭 수만 집계(세션 단위 재응답 방지) — 미착수.

F9의 "웹앱 내 피드백 링크(구글폼)" 항목은 사용자가 구글폼을 직접 만들어야 해서 이번 스코프에서 명시적으로 제외한다.

## 1. F5 — 공용 푸터

`components/lotto/Footer.tsx` 신규 컴포넌트를 만들어 `app/page.tsx`에 하드코딩되어 있던 문구("이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.")를 그대로 옮긴다. `app/layout.tsx`의 `{children}` 아래에 배치해 모든 라우트(`/`, `/generator`, `/stats`)에 공통 적용한다. `app/page.tsx`의 기존 인라인 `<footer>`는 제거한다(중복 방지).

## 2. F9 — Vercel Analytics 연동

`@vercel/analytics` 패키지를 설치하고 `app/layout.tsx`에 `<Analytics />`를 추가해 페이지뷰를 자동 수집한다.

커스텀 이벤트는 `app/generator/page.tsx`의 `handleGenerate()` 안에서 한 곳만 추적한다:

```ts
track('generate', { mode }); // mode: 'count' | 'budget'
```

이벤트명을 늘리지 않고 `mode` 속성으로 세트수 생성/예산 생성을 구분한다. 개인 식별 정보는 포함하지 않는다(번호·전략·모드만).

PRD가 언급한 "판매점 찾기", "피드백 링크 클릭" 이벤트는 각각 F4 미구현, 구글폼 링크 제외로 대상이 없어 이번 스코프에서 뺀다.

## 3. F9 — 마이크로 피드백 (👍/👎)

`components/lotto/MicroFeedback.tsx` 신규 컴포넌트. `app/generator/page.tsx`에서 `games.length > 0`일 때 결과 목록 하단(`<Disclaimer />` 인근)에 **생성 결과 전체에 대해 한 번만** 노출한다(개별 조합 카드마다 붙이지 않음 — 예산 모드에서 최대 200게임까지 나올 수 있어 카드별 부착은 비현실적).

- "이 조합 어때요?" 문구 + 👍/👎 버튼 두 개
- 클릭 시 `track('feedback_thumbs', { value: 'up' | 'down' })`로 Vercel Analytics에 집계한다. 화면에는 숫자를 보여주지 않고 Analytics 대시보드에서만 확인한다(별도 백엔드/DB 없이 F9 Analytics 인프라를 그대로 재사용).
- 클릭 후 버튼 영역은 "감사합니다" 같은 짧은 확인 문구로 바뀌고, `sessionStorage` 키 `lotto-feedback-voted`로 같은 세션에서는 재클릭(재투표)을 막는다(PRD: "재응답 방지는 세션 단위로만 처리").
- 어떤 조합에 투표했는지는 기록하지 않는 순수 익명 클릭 집계다.

## 테스트

- Footer 컴포넌트: 스냅샷/텍스트 렌더링 정도의 가벼운 테스트 또는 생략(기존 F5 First-visit modal도 별도 단위테스트 없이 수동 확인했던 선례를 따름).
- `track()` 호출은 외부 SDK 부수효과라 유닛테스트 대상에서 제외하고, 로컬에서 `npm run dev` 실행 후 브라우저 네트워크 탭으로 이벤트 발생 여부를 수동 확인한다.
- `sessionStorage` 기반 재투표 방지 로직은 컴포넌트 테스트로 검증 가능하면 추가하되, 필수는 아니다.

## 범위 제외

- 구글폼 피드백 링크 (사용자 요청으로 제외)
- F4 판매점 찾기 관련 Analytics 이벤트 (F4 자체가 미구현)
