# F1 번호 생성기 리치 UI 재설계 — Design Spec

## Context

사용자가 다른 로또 분석 사이트(e-ubis.com "DX-VIEW 머니맵")의 스크린샷 3장을 참고로 제시했다. 해당 사이트는 우리 F1보다 훨씬 풍부한 UI를 갖고 있다: 아이콘+설명이 붙은 전략 카드, 결과에 합계/홀짝비율, "종합 적용 알고리즘" 요약 패널, 번호별 활성도 막대그래프, 후보군 리스트(12수 2단계), 번호별 근거+별점이 붙는 "AI 최종 추천 8개", 상세 면책조항. 사용자는 이 수준을 F1에 전체 반영하고, 모바일 반응형으로 만들어달라고 요청했다.

브레인스토밍을 통해 다음을 확정했다:
- 참고 사이트의 모든 패널을 재현한다 (부분 축소가 아닌 전체 복제).
- 기존 5개 단일 기법 전략을 참고 사이트처럼 여러 원자 기법을 가중 조합한 5개 혼합 전략으로 재설계한다.
- 이 리치 UI는 **F1(세트수 기반)에만** 적용한다. F2(예산 기반, 최대 200게임)는 후보군/차트/개별 근거가 200게임 단위에서 의미가 없으므로 기존 단순 리스트 UI를 유지하되, 전략 엔진(가중치 조합 로직)은 F1과 공유한다.
- 번호별 "근거" 문구는 참고 사이트처럼 장식적 텍스트가 아니라, 실제 이력 데이터 계산에서 나온 진짜 근거만 사용한다 (스펙 F1의 "확률/적중률 단어 금지, 재미 요소" 원칙 및 F5 법적 안전장치와 충돌하지 않기 위함).
- PRD(`docs/PRD.md`), PLAN(`docs/PLAN.md`), 원본 스펙(`LOTTO-~1.MD`)도 이번 변경 내용에 맞게 업데이트한다.

## Goals

- F1의 5개 전략을 원자 가중치 소스를 조합한 혼합 전략으로 재설계.
- 결과 화면에 합계/홀짝비율, 알고리즘 요약, 활성도 차트, (종합 랜덤 한정) 후보군 3단계 + AI 최종 추천 8개를 추가.
- 포함 번호(최대 6개) 입력 기능 추가.
- 모바일 우선 반응형 레이아웃 (데스크톱은 2열, 모바일은 1열).
- 상세 면책조항 컴포넌트 추가.
- 모든 새 계산 로직은 Vitest 유닛테스트로 검증.
- PRD/PLAN/스펙 문서를 실제 구현과 일치하도록 갱신.

## Non-goals

- F2(예산 기반) UI에는 후보군/차트/개별 근거 패널을 적용하지 않는다.
- F3(역대 통계 페이지), F4(판매점 찾기)는 이번 스코프에 포함하지 않는다.
- 참고 사이트의 정확한 가중치 배율(엘리트=Hot×3+Trend×3+Cold×2 등)을 그대로 베끼지 않는다 — 대신 스펙 13절의 "AI 종합 = 기존 전략을 섞은 가중 랜덤" 원칙에 맞춰 4개 전략을 동등 비중으로 평균한 "종합 랜덤"을 사용한다.
- 근거 문구를 그럴듯하게 지어내지 않는다 — 계산 불가능한 항목은 표시하지 않는다.

## Architecture

```
lib/lotto/
  weights.ts        # 신규 — 원자적 가중치 소스 함수 모음
  profiles.ts        # 신규 — 5개 혼합 전략을 원자 소스 조합으로 선언
  strategies.ts       # 수정 — profiles.ts 기반으로 generateByStrategy 재구현 (기존 함수 시그니처 유지)
  analysis.ts          # 신규 — 번호별 점수/별점/근거, 후보군 추출, AI 최종 8개 산출
  generate.ts           # 변경 없음
  budget.ts              # 변경 없음 (F2는 기존 엔진 그대로 재사용)

components/lotto/
  StrategyCard.tsx         # 신규 — 아이콘+이름+공식 설명 카드 (기존 pill 버튼 대체)
  ResultSummaryCard.tsx     # 신규 — 결과 세트 + 합계·홀짝비율
  AlgorithmSummaryCard.tsx   # 신규 — "종합 적용 알고리즘" 패널
  ActivityChart.tsx           # 신규 — 번호별 활성도 막대그래프
  CandidatePoolList.tsx        # 신규 — 후보군 12수 리스트
  FinalCandidateCard.tsx      # 신규 — 번호+특징 태그 카드 (별점/AI 라벨 없음)
  IncludeNumbersInput.tsx        # 신규 — 포함 번호 입력 (최대 6개)
  DetailedDisclaimer.tsx          # 신규 — 결과 화면 전용 상세 면책조항
  (기존 Disclaimer.tsx, NumberBall.tsx, GameResultCard.tsx, LatestDraw.tsx, BudgetPicker.tsx는 변경 없이 유지)

app/generator/page.tsx   # 수정 — F1 결과부를 2열 반응형 레이아웃 + 신규 컴포넌트로 재구성. F2 흐름은 유지.
```

기존에 테스트된 `frequencyWeights`, `carryoverWeights`, `coldWeights`, `balancedPick`(현 `strategies.ts`)은 `weights.ts`로 이동/재사용되며, 새 원자 소스 2개(`neighborWeights`, `sameLastDigitWeights`)만 추가로 구현한다.

## 원자 가중치 소스 (`lib/lotto/weights.ts`)

| 소스 | 의미 | 계산 |
|---|---|---|
| `frequencyWeights` | 빈도 | 이력 전체에서 번호별 출현 횟수 (기존 로직 이동) |
| `carryoverWeights` | 이월수 | 직전 회차 번호 가중 부스트 (기존 로직 이동) |
| `coldWeights` | 미출현 역추세 | 마지막 출현 이후 경과 회차 수 (기존 로직 이동) |
| `neighborWeights` | 이웃수 (신규) | 직전 회차 번호의 ±1, ±2 인접 번호에 가중치 부여 |
| `sameLastDigitWeights` | 동끝수 (신규) | 직전 회차 번호와 1의 자리가 같은 번호에 가중치 부여 |

각 함수 시그니처: `(history: LottoDraw[], excluded: number[]) => Map<number, number>` — 기존 패턴 유지.

## 5개 혼합 전략 (`lib/lotto/profiles.ts`)

| id | 라벨 | 조합 공식 | 설명 문구 |
|---|---|---|---|
| `frequency` | 빈도 기반 | freq×1 + carryover×1 + neighbor×1 + sameLastDigit×1 | "빈도 + 이월수 + 이웃수 + 동끝수" |
| `elite` | 엘리트 집중 | frequency×3 + carryover×3 + cold×2 | "빈도×3 + 이월수×3 + Cold×2" |
| `balanced` | 균형 조합 | 기존 `balancedPick` 그대로 | "홀짝 3:3 + 구간 균등배분" |
| `cold` | 미출현 역추세 | cold 상위 25개 번호 풀 내에서 역추세 가중 랜덤 | "미출현 상위 25수 역추세 조합" |
| `random` | 종합 랜덤 | 원자 소스 5개(frequency, carryover, cold, neighbor, sameLastDigit) 균등 평균 | "5개 기법 균등 가중 랜덤" |

`Strategy` 타입 값(`frequency\|carryover\|balanced\|cold\|random`)은 라벨/설명만 갱신하고 `carryover`는 제거(별도 전략에서 빈도 기반에 흡수), 새 5개 id로 교체: `frequency | elite | balanced | cold | random`. 기존 `generateByStrategy(strategy, history, excluded, rng)` 시그니처는 그대로 유지해 `generate.ts`/`budget.ts` 호출부는 수정 불필요.

## 번호별 분석 (`lib/lotto/analysis.ts`)

**점수/별점**: 선택 전략의 최종 가중치 맵을 0~1로 min-max 정규화 후 별 1~5개로 환산 (상위 20% 구간 단위).

**근거 생성 규칙** (모두 실제 계산, 지어낸 문구 없음):

| 조건 | 근거 문구 |
|---|---|
| 직전 회차 당첨번호에 포함 | "이월수 (직전 회차 재출현)" |
| 직전 회차 번호와 거리 1~2 | "직전 N번의 ±거리 근접수" |
| 직전 회차 번호와 끝자리 동일 | "직전 N번과 끝수 동일 (동끝수)" |
| 최근 24회 출현 횟수 2~4회 | "최근 24회 빈도 X회" |
| 위 조건 모두 해당 없음 | "구간 균등 분포 후보" |

한 번호에 여러 조건이 해당하면 최대 2개까지만 표시.

**후보군 3단계** (종합 랜덤 선택 시에만 노출):
1. `getPrimaryCandidates(history, excluded)`: 빈도 기반 전략 가중치 상위 12개
2. `getSpreadCandidates(history, excluded)`: 4개 전략(빈도/엘리트/균형/Cold) 각각의 순위를 합산 재정렬한 상위 12개
3. `getFinalRecommendations(history, excluded)`: 2단계 풀에서 최종 8개, 각각 `{ number, stars, reasons, dominantStrategy }` 반환

## UI / 반응형 레이아웃

- **모바일 (`< lg`)**: 1열 — 전략 카드 → 세트수/예산 토글 → 제외번호 → 포함번호 → 생성 버튼 → 결과(요약카드 → 알고리즘 패널 → 활성도 차트 → [종합 랜덤만] 후보군 → AI 추천 8개) → 상세 면책조항.
- **데스크톱 (`≥ lg`, 1024px)**: `grid grid-cols-1 lg:grid-cols-[380px_1fr]` — 좌측 컬럼(전략 선택+입력 폼), 우측 컬럼(직전회차+결과 전체).
- 포함 번호 입력은 제외 번호 입력 바로 아래, 최대 6개, 제외 번호와 겹치면 경고 문구.
- F2는 기존 세로 1열 유지, 카드 너비만 반응형.

## 활성도 막대그래프 (dataviz 스킬 적용)

- x축: 1~45번, y축: 선택 전략의 정규화 가중치.
- 기본 막대 색: 기존 `NumberBall` 저/중/고구간 색상 재사용 (일관성).
- 종합 랜덤 선택 시, 최종 추천 8개에 해당하는 막대만 강조색(파란색)으로 표시.
- 구현 전 `dataviz` 스킬 가이드(팔레트/폼 휴리스틱)를 따른다.

## 면책조항 확장

기존 `Disclaimer.tsx`(짧은 문구, 홈 화면 등에서 계속 사용)는 유지하고, 결과 화면 전용 `DetailedDisclaimer.tsx`를 신규 추가:

> 본 분석은 통계 기반 참고 정보입니다 (기준 회차: OO회, YYYY-MM-DD). 실제 결과와 차이가 있을 수 있으며 당첨을 보장하지 않습니다. 로또는 1~45 중 6개를 무작위로 추첨하는 완전 확률 게임이며, 과거 패턴이 미래 결과를 예측하지 않습니다. 본 정보는 재미를 위한 통계이며 투자·도박 조언이 아닙니다. 정확한 당첨 결과는 동행복권(dhlottery.co.kr)에서 확인하세요.

기준 회차/날짜는 `/api/lotto/latest` 응답을 그대로 사용.

## 문서 업데이트

- `LOTTO-~1.MD`(원본 스펙) 6절 F1 Acceptance Criteria — 5개 전략 이름/설명을 혼합 전략으로 갱신, 포함 번호/후보군/AI 추천 항목 추가.
- `docs/PRD.md` — 위와 동일하게 동기화 (Notion Documents sync 원본).
- `docs/PLAN.md` / `docs/superpowers/plans/2026-07-10-lotto-f1-f2.md` — 이번 재설계는 별도 구현 계획 문서(`docs/superpowers/plans/2026-07-10-f1-rich-ui-redesign.md`)로 새로 작성하고, PLAN.md는 그 최신 계획을 반영하도록 갱신.
- Notion Documents DB의 PRD/PLAN 페이지(`page_id`는 `.notion/config/notion-sync.config.local.json`에 기록됨) — `sync_notion_documents.py`로 본문 갱신 (구현 완료 후 1회).

## 테스트 전략

- `weights.test.ts`: 5개 원자 소스 함수 각각 유닛테스트 (신규 2개 포함).
- `profiles.test.ts`: 5개 혼합 전략이 6개 고유 번호를 반환하는지, 제외 번호를 지키는지.
- `analysis.test.ts`: 특징 태그 생성 조건, 후보군 12/12/8 산출 로직.
- 기존 `strategies.test.ts`, `generate.test.ts`, `budget.test.ts`, `history.test.ts`는 시그니처 불변이므로 그대로 유지, 필요시 새 라벨에 맞춰 최소 수정.
- UI는 Playwright로 데스크톱/모바일 뷰포트 각각 수동 검증 (기존 방식과 동일).

## Amendments (PRD 최종본 반영, 2026-07-10)

사용자가 이 설계를 바탕으로 `docs/lotto-mini-app-spec.md`를 최종 PRD로 작성했다. 이 문서가 이제 **canonical spec**이며, 아래 항목은 최초 설계에서 변경되었다:

- **별점/"AI 추천" 라벨 제거**: 번호별 점수를 별 1~5개로 보여주는 설계를 폐기한다. "AI 최종 추천 8개" → **"최종 조합 후보 8개"**로 개명하고, 각 번호에는 실제 계산에서 나온 특징 태그만 붙인다(별점·순위·점수 없음). 이유: 이 앱은 LLM을 쓰지 않는데 "AI"라는 라벨은 근거가 있는 것처럼 보이게 하고, 별점은 통계적으로 무의미한 과거 빈도를 "더 나은 선택"처럼 보이게 해 F5(법적 안전장치)의 과장 금지 원칙과 충돌한다. → `AiRecommendationCard.tsx`는 `FinalCandidateCard.tsx`로 이름 변경.
- **포함 번호 최대 개수**: 6개 → **5개**로 조정 (6개 모두 고정하면 생성 로직 자체가 무의미해지므로).
- **"종합 랜덤" 계산 공식 확정**: elite(frequency×3+cold×2)를 포함해 4개 전략을 평균하면 frequency/cold가 이중 반영되는 문제가 있어, **원자 소스 5개(frequency, carryover, cold, neighbor, sameLastDigit)를 각각 ×1로 균등 평균**하는 방식으로 확정.
- **접근성**: 활성도 차트·특징 태그·최종 조합 후보 카드에 `aria-label` 포함.
- F3(역대 통계)이 `weights.ts`의 빈도 집계 로직을 재사용하도록 명시.

세부 Acceptance Criteria, 타임라인, F2~F8 변경 사항은 `docs/lotto-mini-app-spec.md`를 참고한다. 이 설계 문서는 아키텍처/파일구조/원자소스·전략 정의의 기술적 근거로 유지하고, 세부 요구사항의 최종 출처는 PRD로 이관한다.

## Self-Review

- **플레이스홀더 없음**: 모든 섹션에 실제 값/공식이 명시됨.
- **일관성**: `Strategy` 타입 변경(`carryover` 제거, `elite` 추가)이 `strategies.ts`/`generate.ts`/`budget.ts`/UI 전반에 미치는 영향을 architecture 섹션에서 명시함.
- **스코프**: F1 전용으로 한정, F2/F3/F4는 non-goals에 명시. 단일 구현 계획으로 다루기에 적절한 크기.
- **모호성 점검**: "근거 문구"가 실제 계산 기반이어야 한다는 제약을 반복 명시해 지어낸 텍스트 사용 여지를 없앰.
