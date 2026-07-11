# F3: 역대 최다 출현 번호 통계 — 설계

> 참고: [docs/PRD.md](../../PRD.md) F3절, [docs/PLAN.md](../../PLAN.md)(F1 리치 UI), 기존 F1/F2 구현(`lib/lotto/`, `app/generator/`)

## 배경 및 목표

F1(번호 생성기)·F2(예산 기반 생성)는 이미 구현 완료됐다. PRD 11절 타임라인 순서상 다음 기능은 F3(역대 최다 출현 번호 TOP 6)이다. F3는 1회차부터 현재까지 전체 회차의 당첨번호를 집계해 번호별 출현 빈도 순위를 보여주는 기능으로, 기존에 확보된 `lib/lotto/weights.ts`의 빈도 계산 개념을 재사용하되 전체 회차 규모(1,200회 이상)에 맞는 새 데이터 파이프라인이 필요하다.

**중요한 제약**: 현재 `data/lotto-history-seed.json`은 F1/F2용으로 **최근 150회차(1082~1231회)**만 담고 있다. F3는 "역대 전체" 기준이어야 하므로, 이 파일을 건드리지 않고 별도의 전체 회차 데이터셋을 새로 만든다. F1/F2의 기존 전략 계산(빈도/이월수/미출현 가중치)은 이번 작업으로 전혀 영향받지 않는다.

## 범위

- 전체 회차(1~1231회, 현재 캐시된 최신 확정 회차 기준) 신규 수집
- TOP 6 강조 표시 + 전체 1~45번 순위 펼쳐보기 포함
- 홈 화면 미리보기 카드 + 별도 상세 페이지(`/stats`)
- 집계는 원본 전체 회차 JSON만 저장하고 서버에서 즉시 계산(사전 집계 캐시 파일은 만들지 않음 — 1231건 집계는 성능상 문제가 없어 별도 캐시 파일을 유지하는 복잡도가 이득보다 큼)

**범위 밖**: 전체 회차 데이터의 자동/주기적 갱신(배치 스케줄링), F4(판매점 찾기), F5 전체 적용(최초 진입 모달 등)은 이번 작업에 포함하지 않는다.

## 아키텍처

### 1. 데이터 수집 — `scripts/fetch-lotto-history.ts` 확장

기존 스크립트(`fetchRound`, picknum.com 파싱 로직)를 그대로 재사용하되, 출력 파일명을 3번째 CLI 인자로 받도록 수정한다. 기본값은 기존 `lotto-history-seed.json`을 유지해 F1/F2 재수집 시 동작이 바뀌지 않게 한다.

```
npx tsx scripts/fetch-lotto-history.ts 1 1231 lotto-full-history.json
```

- 결과물: `data/lotto-full-history.json` — `LottoDraw[]` 형태, 1~1231회 전체(파싱 실패 회차는 기존처럼 스킵되고 콘솔에 로그).
- `latest-draw-fallback.json` 쓰기 로직은 그대로 둔다(최신 회차 값이 동일하므로 부작용 없음).

### 2. 집계 로직 — `lib/lotto/stats.ts` (신규)

```ts
export interface FrequencyRankEntry {
  number: number;
  count: number;
  rank: number;
}

export function computeFrequencyRanking(history: LottoDraw[]): FrequencyRankEntry[]
```

- 1~45번 전체(0회 출현 포함)를 대상으로 출현 횟수를 집계한다.
- 출현 횟수 내림차순, 동률이면 번호 오름차순으로 정렬 후 1~45위를 순차 부여한다(동률도 순차 순위 — 동순위 표기는 하지 않는다. 45개 규모에서 단순함을 우선).
- 회차 범위(최소/최대 `drawNumber`)와 최신 날짜는 이 함수가 아니라 호출부에서 `history` 배열로부터 직접 구한다(별도 필드 불필요).

### 3. `/stats` 페이지 (신규, Server Component)

`app/stats/page.tsx` — `'use client'` 없이 서버 컴포넌트로 작성. `data/lotto-full-history.json`을 직접 import하고 `computeFrequencyRanking`을 호출해 렌더링한다.

레이아웃(위→아래):
1. "역대 가장 많이 나온 번호는 {1위 번호}번입니다" 강조 문구
2. TOP 6 리스트 — 번호(`NumberBall` 재사용) + 출현 횟수
3. 집계 기준 문구 — "{최소 회차}회 ~ {최대 회차}회 기준, 최종 갱신 {최신 날짜}"
4. 펼쳐보기 토글 — 전체 1~45위 표. 토글 상태(collapsed/expanded)는 상호작용이 필요하므로 별도 클라이언트 컴포넌트로 분리한다.
5. 하단 디스클레이머 — "이 통계는 과거 데이터일 뿐이며 향후 당첨을 예측하지 않습니다."

새 컴포넌트: `components/lotto/FullRankingToggle.tsx` (`'use client'`)
- Props: `entries: FrequencyRankEntry[]`
- "전체 순위 펼쳐보기" / "접기" 버튼과 순위 표(번호·출현횟수·순위) 렌더링. 기존 F2의 접기/펼치기 패턴(`app/generator/page.tsx`의 `collapsed` state)과 동일한 UX 관례를 따른다.

### 4. 홈 화면 미리보기

`app/page.tsx`(기존 Server Component)에 카드 추가:
- TOP 6 번호를 `NumberBall`로 나열
- "전체 통계 보기 →" 링크(`/stats`로 이동)
- 배치 위치: 생성기 진입 버튼 다음, 기존 `<Disclaimer />` 앞

홈페이지도 `data/lotto-full-history.json` + `computeFrequencyRanking`을 직접 사용한다(서버 컴포넌트이므로 클라이언트 번들 영향 없음).

## 테스트 계획

`lib/lotto/stats.test.ts`:
- 합성 히스토리로 번호별 카운트가 정확한지 검증
- 45개 번호 전체가 반환되는지(0회 출현 번호 포함) 검증
- 내림차순 정렬 + 동률 시 번호 오름차순 tie-break 검증
- 순위(rank)가 1~45 연속으로 부여되는지 검증

수동 검증: `npm run dev` → `/stats`에서 TOP6/펼쳐보기/회차범위/디스클레이머 확인, 홈(`/`)에서 미리보기 카드와 링크 이동 확인.

## 에러 처리

- `data/lotto-full-history.json` 파싱 실패 회차가 있어 45개 중 일부 번호가 0회로 나올 가능성이 있음 — 이는 정상 동작이며 별도 에러 처리 불필요(정적 빌드 타임 데이터라 런타임 실패 케이스가 없음).
