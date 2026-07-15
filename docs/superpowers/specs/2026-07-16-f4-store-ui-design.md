# F4 판매점 지도/리스트 UI Design

## 배경

F4 데이터 파이프라인(지오코딩 + 매칭 + `data/lotto-stores.json` 생성)은 이미 완료되어 master에 병합되어 있다(현재 346개 판매점, 21개 배지 매칭, 전체 8,802건 중 340건 지오코딩 완료 — 나머지는 별도 배치로 이어서 채울 예정). 이 스펙은 그 데이터를 소비하는 실제 사용자 화면(F4의 "핵심 차별화 기능" 부분)을 다룬다.

**전제:** Kakao Maps JavaScript SDK 키와 도메인 등록이 이미 완료된 상태다(REST 키와 별개).

## 1. 라우트 & 데이터 로딩

- `app/stores/page.tsx` 신규 라우트. `data/lotto-stores.json`을 정적 import로 읽는다 — F1/F3가 `data/lotto-full-history.json`을 읽는 것과 동일한 패턴(별도 API 라우트 없음, 빌드에 데이터가 포함됨).
- `app/page.tsx`(홈)에 "판매점 찾기" 진입 카드를 추가한다 — F3의 TOP6 미리보기 카드와 같은 스타일로, PRD 8절 화면 구성에 명시된 요구사항.

## 2. 리스트 뷰 (기본 화면)

- `components/lotto/StoreCard.tsx` — 판매점 카드. 기본 상태는 상호명 + (위치 있으면 거리, 없으면 주소 요약) + 배지(있으면 "1등 O회 배출"). `GameResultCard`와 동일하게 `bg-white rounded-xl shadow-sm` 스타일 재사용.
  - 카드 클릭 시 `useState` 확장 토글로 그 자리에서 펼쳐짐: 전체 주소, 배지 상세 문구("자동선택 당첨 기준"), 길찾기 링크.
  - 배지가 있는 카드에는 확장 시 "특정 판매점 이용이 당첨 확률에 영향을 주지 않습니다." 문구를 함께 표시한다(F5 AC).
- `components/lotto/StoreListView.tsx` — 정렬/필터링된 카드 목록 렌더링.
- 길찾기 링크 형식: `https://map.kakao.com/link/to/{상호명},{lat},{lng}` (API 키 불필요, 새 탭으로 연다).

## 3. 지도 뷰

- `components/lotto/StoreMapView.tsx` — Kakao Maps JS SDK를 `next/script`(또는 동적 `<script>` 삽입)로 로드하되, **지도 뷰로 전환할 때만 로드**한다(리스트 뷰가 기본이라 초기 페이지는 지도 SDK 없이 가볍게 유지).
- `MarkerClusterer`로 전체 마커를 클러스터링한다 — PRD가 "선택 아님, 필수"로 명시한 요구사항.
- 마커 클릭 시 Kakao `InfoWindow`로 상호명 + 배지 + 길찾기 링크를 오버레이로 보여준다(공간이 좁아 리스트 뷰의 카드 확장과 달리 요약 정보만).

## 4. 위치 권한 & 정렬

상태 모델:
- `locationStatus: 'idle' | 'granted' | 'denied' | 'unsupported'`
- `userPosition: { lat: number; lng: number } | null`
- `sortBy: 'distance' | 'count'` — 기본값 `'count'`
- `regionFilter: string | null` — 위치를 못 쓸 때만 의미 있음

동작:
- 페이지 로드 시 위치 권한을 자동으로 요청하지 않는다(브라우저 자동 팝업 지양). 기본 정렬은 **배출횟수순**(1등 배출 많은 순).
- 상단에 **"내 위치로 정렬"** 버튼을 둔다.
  - 클릭 시 `navigator.geolocation.getCurrentPosition` 호출.
  - **허용**되면 `userPosition` 저장, `sortBy`를 `'distance'`로 전환, 버튼이 `[거리순 | 배출횟수순]` 토글로 바뀐다.
  - **거부**되거나 미지원이면 지역(시/도) 드롭다운을 표시해 리스트를 해당 지역으로 필터링한다(정렬 기준은 배출횟수순 유지).
- 지역 드롭다운의 선택지는 하드코딩하지 않고, 로드된 `data/lotto-stores.json`의 `roadAddress`에서 선두 시/도 토큰을 추출해 동적으로 구성한다(예: "서울특별시 강남구 ..." → "서울특별시"). 지금은 데이터가 서울 위주라 선택지가 적겠지만, 이후 전체 배치가 채워지면 자동으로 늘어난다.

## 5. 법적 문구 & 데이터 기준일

PRD F4/F5에 정의된 문구를 그대로 사용한다:
- 화면 상단(리스트/지도 공통): "판매점 목록은 2025-06-07 기준이며, 폐업·신규 매장이 반영되지 않았을 수 있습니다. 1등 배출 이력은 2025년 6월 기준입니다."
- 배지가 있는 카드 확장 시: "자동선택 당첨 기준" + "특정 판매점 이용이 당첨 확률에 영향을 주지 않습니다."

## 파일 구조 요약

- Create: `app/stores/page.tsx`
- Create: `components/lotto/StoreCard.tsx`
- Create: `components/lotto/StoreListView.tsx`
- Create: `components/lotto/StoreMapView.tsx`
- Create: `lib/stores/distance.ts` — 순수 함수: 두 좌표 간 거리 계산(haversine), 정렬/지역 추출 로직. 단위테스트 대상(이 프로젝트 컨벤션: 순수 로직은 `lib/`에서 테스트, 지도 SDK 연동 같은 브라우저 전용 코드는 수동 검증).
- Modify: `app/page.tsx` — 판매점 찾기 진입 카드 추가.

## 테스트 & 검증

- `lib/stores/distance.ts`의 거리 계산, 시/도 추출, 정렬 로직은 순수 함수라 유닛테스트한다.
- `StoreMapView`(Kakao SDK 로딩, 마커 렌더링, 클러스터링)는 브라우저 전용 기능이라 이 프로젝트의 기존 컨벤션대로 자동화 테스트 없이 `npm run dev`로 수동 검증한다(F1의 `LatestDraw`, F5의 `FirstVisitNotice` 등과 동일).
- 위치 권한 허용/거부 두 경로 모두 브라우저 개발자도구로 수동 검증한다(권한 상태를 강제로 바꿔가며 테스트).

## 범위 제외

- 즐겨찾기 판매점(F7, 2단계) — 이번 스펙에 포함하지 않는다.
- 전체 8,802건 지오코딩 완료 — 데이터 파이프라인 쪽 후속 작업이며 이 UI 스펙과 독립적으로 진행 가능하다(데이터가 늘어나면 UI는 그대로 더 많은 마커/카드를 보여줄 뿐, 코드 변경이 필요 없다).
