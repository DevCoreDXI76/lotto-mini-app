# 로또 미니앱 — 기술 아키텍처 & 설계 문서

> 이 문서는 요구사항이 아니라 **기술 설계**를 다룬다. 기능 요구사항/Acceptance Criteria는 [docs/PRD.md](./PRD.md)를, 구현 실행 이력(태스크별 커밋 로그)은 `docs/superpowers/plans/`를 참고한다. 이 문서는 F1(혼합 전략 리치 UI), F3(역대 통계), F5(최초 진입 안내 모달), F6(최근 생성 번호 히스토리)의 아키텍처를 다룬다 — F2는 별도 설계 없이 기존 엔진을 재사용하고, F4/F7/F9~F13은 아직 설계 전이다.

## 공통 파일 구조

```
lib/lotto/
  types.ts          # Strategy, StrategyMeta, LottoDraw, GeneratedGame 타입
  weights.ts          # 원자적 가중치 소스 5종 (frequency/carryover/cold/neighbor/sameLastDigit) + pickWeighted
  profiles.ts           # 5개 혼합 전략을 원자 소스 조합으로 선언
  strategies.ts          # profiles.ts 기반 얇은 디스패처 (generateByStrategy, normalizeIncluded)
  analysis.ts              # 번호별 특징 태그, 후보군 3단계 산출 (F1 종합 랜덤 전용)
  stats.ts                   # 전체 회차 빈도 순위 집계 (F3)
  generate.ts                  # 중복 없는 게임셋 생성기 (F1/F2 공유)
  budget.ts                     # 예산 → 게임 수 변환 (F2)
  history.ts                     # 최근 150회차 히스토리 로더 (F1/F2용, data/lotto-history-seed.json)
  useLatestDraw.ts                 # 직전 회차 조회 클라이언트 훅

components/lotto/
  StrategyCard, ResultSummaryCard(GameResultCard의 showStats), AlgorithmSummaryCard,
  ActivityChart, CandidatePoolList, FinalCandidateCard, IncludeNumbersInput,
  DetailedDisclaimer, FullRankingToggle(F3), NumberBall, LatestDraw, Disclaimer,
  BudgetPicker, GameResultCard

app/
  page.tsx            # 홈 — 직전회차 + 생성기 진입 + F3 TOP6 미리보기 + Disclaimer
  generator/page.tsx    # F1(세트수)/F2(예산) 통합 화면, 2열 반응형
  stats/page.tsx          # F3 — 역대 통계 (Server Component)
  api/lotto/latest/route.ts # 직전 회차 조회, 정적 캐시 폴백

data/
  lotto-history-seed.json    # 최근 150회차 (F1/F2 가중치 계산용)
  lotto-full-history.json      # 전체 회차 1~1231 (F3 빈도 집계 전용, F1/F2와 분리)
  latest-draw-fallback.json      # 직전 회차 폴백 캐시

scripts/fetch-lotto-history.ts  # picknum.com 스크래핑, 출력 파일명을 인자로 받음 (기본값 lotto-history-seed.json)
```

## F1 — 번호 생성기 혼합 전략 아키텍처

### 원자 가중치 소스 (`lib/lotto/weights.ts`)

| 소스 | 의미 | 계산 |
|---|---|---|
| `frequencyWeights` | 빈도 | 이력 전체에서 번호별 출현 횟수 |
| `carryoverWeights` | 이월수 | 직전 회차 번호 가중 부스트 |
| `coldWeights` | 미출현 역추세 | 마지막 출현 이후 경과 회차 수 |
| `neighborWeights` | 이웃수 | 직전 회차 번호의 ±1, ±2 인접 번호 가중 |
| `sameLastDigitWeights` | 동끝수 | 직전 회차 번호와 1의 자리가 같은 번호 가중 |

각 함수 시그니처: `(history: LottoDraw[], excluded: number[]) => Map<number, number>`. `mergeWeights([Map, multiplier][])`로 여러 소스를 가중 합산한다.

### 5개 혼합 전략 (`lib/lotto/profiles.ts`)

| id | 라벨 | 조합 공식 |
|---|---|---|
| `frequency` | 빈도 기반 | freq×1 + carryover×1 + neighbor×1 + sameLastDigit×1 |
| `elite` | 엘리트 집중 | frequency×3 + carryover×3 + cold×2 |
| `balanced` | 균형 조합 | 홀짝 3:3 + 구간 균등배분 (셔플 후 조건 검증 재시도) |
| `cold` | 미출현 역추세 | cold 상위 25개 번호 풀 내 가중 랜덤 |
| `random` | 종합 랜덤 | 원자 소스 5개(frequency, carryover, cold, neighbor, sameLastDigit)를 각각 ×1로 균등 평균 |

**설계 결정**: "종합 랜덤"을 `elite` 등 상위 혼합 전략 4개의 평균이 아니라 원자 소스 5개의 균등 평균으로 정의했다 — `elite` 자체가 이미 frequency·cold를 포함해서 혼합 전략끼리 평균하면 이중 반영되는 문제가 있었기 때문. `generateByStrategy(strategy, history, excluded, rng?, included?)` 시그니처는 F1 최초 구현 이후 변경 없이 유지되어 `generate.ts`/`budget.ts` 호출부가 영향받지 않는다.

### 번호별 분석 (`lib/lotto/analysis.ts`, 종합 랜덤 전략 전용)

**특징 태그 생성 규칙** (모두 실제 계산, 지어낸 문구 없음 — 최대 2개까지 표시):

| 조건 | 태그 문구 |
|---|---|
| 직전 회차 당첨번호에 포함 | "이월수 (직전 회차 재출현)" |
| 직전 회차 번호와 거리 1~2 | "직전 N번의 ±거리 근접수" |
| 직전 회차 번호와 끝자리 동일 | "직전 N번과 끝수 동일 (동끝수)" |
| 최근 24회 출현 횟수 2~4회 | "최근 24회 빈도 X회" |
| 해당 없음 | "구간 균등 분포 후보" |

**후보군 3단계**: `getPrimaryCandidates`(빈도 전략 상위 12개) → `getSpreadCandidates`(4개 전략 순위 합산 상위 12개) → `getFinalCandidates`(최종 8개, 번호+태그).

별점·순위·점수·"AI 추천" 라벨은 사용하지 않는다 — 통계적으로 무의미한 과거 빈도를 "더 나은 선택"처럼 보이게 하는 표현은 PRD F5(법적 안전장치)의 과장 금지 원칙과 충돌하기 때문이다. 패널명은 "최종 조합 후보"로 중립적으로 표기한다.

### 반응형 레이아웃

모바일(`< lg`) 1열, 데스크톱(`≥ lg`, 1024px) `grid-cols-[380px_1fr]` 2열(좌: 전략/입력, 우: 결과). F2(예산 기반)는 후보군/차트/활성도 패널을 적용하지 않고 기존 단순 리스트 UI를 유지하되, 전략 계산 엔진은 F1과 공유한다.

## F3 — 역대 통계 아키텍처

### 데이터 파이프라인

F1/F2가 쓰는 `data/lotto-history-seed.json`(최근 150회차)과는 별도로, F3는 전체 회차(1~1231회) 원본을 `data/lotto-full-history.json`에 저장한다. 두 데이터셋을 분리한 이유: F1/F2의 전략 가중치 계산(빈도/이월수/cold)이 "최근 경향"을 반영하도록 설계되어 있어, 전체 역사로 바꾸면 기존 전략 성격이 미세하게 달라지기 때문이다.

수집은 `scripts/fetch-lotto-history.ts`(출력 파일명을 3번째 CLI 인자로 받도록 확장, 기본값은 기존 파일명 유지)로 1회 실행한다.

### 집계 (`lib/lotto/stats.ts`)

`computeFrequencyRanking(history: LottoDraw[]): FrequencyRankEntry[]` — 45개 번호 전체(0회 출현 포함)를 출현 횟수 내림차순, 동률이면 번호 오름차순으로 정렬해 1~45위를 순차 부여한다(동순위 표기 없음). 사전 집계 캐시 파일은 만들지 않는다 — `/stats` 페이지와 홈 미리보기 카드가 각각 Server Component에서 즉시 계산한다(1231건 순회는 성능상 문제 없음).

### 화면

- `/stats`(신규): TOP 6 강조 + 전체 1~45위 펼쳐보기(`FullRankingToggle`, 클라이언트 컴포넌트) + 집계 기준 회차 범위/갱신일 + "이 통계는 과거 데이터일 뿐이며 향후 당첨을 예측하지 않습니다" 디스클레이머.
- 홈(`/`): TOP 6 번호 미리보기 카드 + `/stats` 링크.

## F5 — 최초 진입 안내 모달

### 컴포넌트 (`components/lotto/FirstVisitNotice.tsx`, 신규)

`localStorage` 키 `lotto-first-visit-seen`으로 노출 여부를 추적하는 클라이언트 컴포넌트. 서버 렌더링 시에는 항상 "숨김" 상태로 렌더링하고, 마운트 후 `useEffect`에서 `localStorage.getItem(...)`을 확인해 값이 없을 때만 `visible` 상태를 켠다 — 이렇게 하면 서버/클라이언트 최초 렌더가 항상 일치해 하이드레이션 불일치가 생기지 않는다.

내용은 PRD F5 AC 그대로: "이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다." "확인" 버튼 클릭 시에만 닫히며(백드롭 클릭·ESC로는 닫히지 않음), 클릭 시 `localStorage.setItem(...)` 후 다시는 노출되지 않는다. 어두운 반투명 백드롭 위에 기존 카드 스타일(`bg-white rounded-xl shadow-sm`)을 재사용한 중앙 정렬 다이얼로그, `role="dialog"` `aria-modal="true"` 적용.

### 적용 위치

`app/layout.tsx`(루트 레이아웃)에서 `{children}`과 함께 항상 렌더링한다 — 홈이 아니라 `/generator`나 `/stats`로 공유 링크를 통해 처음 들어오더라도 동일하게 1회 노출되도록, 개별 페이지가 아닌 루트에 둔다.

## F6 — 최근 생성 번호 히스토리

### 데이터 모델 & 순수 로직 (`lib/lotto/recentHistory.ts`, 신규)

```ts
export interface HistoryEntry {
  numbers: number[];
  strategy: Strategy;
  timestamp: number;
}

export const MAX_HISTORY_ENTRIES = 20;

export function prependEntries(
  current: HistoryEntry[],
  newEntries: HistoryEntry[],
): HistoryEntry[]
```

`prependEntries`는 새 항목을 배치로 받은 순서 그대로 맨 앞에 붙이고, 기존 항목을 뒤에 이어 붙인 뒤 `MAX_HISTORY_ENTRIES`(20개)를 넘는 오래된 항목을 잘라낸다. DOM/localStorage에 의존하지 않는 순수 함수라 단위테스트로 순서·캡 로직을 검증한다.

### localStorage 연동 (`lib/lotto/useRecentHistory.ts`, 신규)

`lib/lotto/useLatestDraw.ts`와 동일한 클라이언트 훅 패턴. `localStorage` 키 `lotto-recent-history`에 `HistoryEntry[]`를 JSON으로 저장한다. 마운트 시 1회 로드하며, 파싱 실패나 형식이 예상과 다르면 빈 배열로 안전하게 폴백한다(사용자가 만들어낸 첫 localStorage 데이터라 F5의 단순 플래그와 달리 방어적 파싱이 필요하다). `addGames(games, strategy)` 호출 시 `Date.now()`를 공유 타임스탬프로 써서 `prependEntries`를 적용하고, 상태와 localStorage를 함께 갱신한다.

### 적용 지점

`app/generator/page.tsx`의 `handleGenerate`에서 **세트수 모드(F1)일 때만** `addGames`를 호출한다 — 예산 모드(F2, 최대 200게임)를 히스토리에 넣으면 20개 캡이 한 번의 생성으로 즉시 소진되어 의미가 없기 때문이다.

### 화면 (`components/lotto/RecentHistoryList.tsx`, 신규)

`/generator` 페이지 하단에 인라인 섹션으로 배치(모드와 무관하게 항목이 있으면 항상 표시 — 과거 세트수 모드 생성 기록이므로 현재 모드에 좌우되지 않는다). 항목별로 `NumberBall`로 번호를 나열하고, `STRATEGIES`에서 찾은 전략 라벨(찾지 못하면 원본 id로 폴백), `HH:mm` 형식의 생성 시각, 그리고 `GameResultCard`와 동일한 복사 인터랙션(클릭 시 "복사됨"으로 잠시 바뀜)의 복사 버튼을 보여준다. 전체 지우기 기능은 만들지 않는다.

## 문서 동기화

Notion Documents DB와 동기화되는 파일은 `docs/PRD.md`, `docs/superpowers/plans/2026-07-10-f1-rich-ui-redesign.md`(plan) 두 개뿐이며 매핑은 `.notion/scripts/sync_notion_documents.py`의 `export_markdown()`에 있다. `docs/PLAN.md`, `docs/PRD.md`(구버전)처럼 루트에 별도 사본을 두지 않고 실제 원본 경로를 직접 가리킨다 — 사본이 새 버전과 어긋나는 문제를 근본적으로 없애기 위함.
