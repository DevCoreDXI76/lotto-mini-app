# F4 판매점 데이터 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F4(판매점 지도)의 지도/리스트 UI가 소비할 정적 데이터 `data/lotto-stores.json`을 만든다 — 전국 판매점 주소를 지오코딩하고, 1등 배출 이력 데이터와 매칭해서 배지 정보를 붙인 결과물이다. 이 계획은 데이터 파이프라인까지만 다루고, 지도/리스트 화면(UI)은 이 데이터가 준비된 뒤 별도 계획으로 이어간다.

**Architecture:** `scripts/fetch-lotto-history.ts`(F1/F3에서 이미 쓰는 배치 스크립트 패턴)를 그대로 따른다 — 순수 로직(CSV 파싱, 매칭 알고리즘)은 `lib/stores/`에 두어 유닛테스트하고, 외부 API 호출(Kakao 지오코딩)은 `scripts/`의 얇은 래퍼로 감싼다. 지오코딩은 진행 상황을 `data/raw/geocode-cache.json`에 캐시해 재실행 시 이어서 처리한다(카카오 쿼터가 8,802건을 한 번에 감당 못 할 가능성 — PRD 11절 Open Question — 을 코드 설계로 흡수).

**Tech Stack:** 기존과 동일(TypeScript, `tsx`로 스크립트 실행, `node:fs`/네이티브 `fetch`). 신규 외부 패키지 없음 — CSV 파싱은 직접 구현하고, EUC-KR 인코딩은 Node 내장 `TextDecoder`로 처리한다(신규 npm 의존성 불필요).

## Global Constraints

- 데이터셋 A(1등 배출 판매점, `data.go.kr/data/15059963`): 463건, 필드 `상호`/`지역`(시군구 텍스트)/`1등 자동 당첨 건수`. 좌표 없음. 수동선택 당첨은 집계에 포함되지 않는다.
- 데이터셋 B(판매점 주소 전체, `data.go.kr/data/15086355`): 8,802건, 필드 `상호`/`도로명주소`/`지번주소`. 좌표 없음. 2025-06-07 기준 1회성 스냅샷.
- 두 데이터셋은 상호명 기준으로 조인하되, 동일 상호명이 같은 지역에 여럿이면(모호한 경우) **특정 매장에 배지를 단정적으로 붙이지 않는다** — PRD F4/Non-goals 원칙.
- 지오코딩은 도로명주소로 먼저 시도하고 실패하면 지번주소로 재시도한다.
- 카카오 지오코딩 무료 쿼터가 2026-07-21 정책 변경과 맞물려 불확실하다(PRD 9절/11절) — 이 계획은 전체 8,802건을 한 번에 처리하는 것을 목표로 하지 않는다. 소규모 샘플(20건)로 파이프라인이 올바르게 동작하는지만 검증하고, 전체 배치 실행은 이 계획 밖의 별도 수동 작업으로 남긴다(Task 5 하단 참고).
- 최종 산출물 `data/lotto-stores.json`은 프론트가 그대로 읽을 정적 캐시다 — 런타임에 이 파이프라인을 다시 호출하지 않는다.

---

## Task 1: CSV 파싱 순수 함수

**Files:**
- Create: `lib/stores/types.ts`
- Create: `lib/stores/parseCsv.ts`
- Test: `lib/stores/parseCsv.test.ts`

**Interfaces:**
- Produces: `parseCsvRows(text: string): string[][]`, `csvRowsToObjects(rows: string[][]): Record<string, string>[]` — Task 3(지오코딩 스크립트)와 Task 4(조립 스크립트)가 사용.
- Produces (타입): `WinnerRecord`, `AddressRecord`, `GeocodedAddress`, `StoreWithBadge`, `AmbiguousGroup`, `MatchResult` — Task 2·3·4가 사용.

- [ ] **Step 1: 타입 정의**

```ts
// lib/stores/types.ts
export interface WinnerRecord {
  name: string;
  region: string;
  firstPrizeAutoCount: number;
}

export interface AddressRecord {
  name: string;
  roadAddress: string;
  jibunAddress: string;
}

export interface GeocodedAddress extends AddressRecord {
  lat: number;
  lng: number;
}

export interface StoreWithBadge extends GeocodedAddress {
  firstPrizeAutoCount: number;
}

export interface AmbiguousGroup {
  name: string;
  region: string;
  firstPrizeAutoCount: number;
  candidateCount: number;
}

export interface MatchResult {
  matched: StoreWithBadge[];
  ambiguousGroups: AmbiguousGroup[];
  unmatchedWinners: WinnerRecord[];
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// lib/stores/parseCsv.test.ts
import { describe, it, expect } from 'vitest';
import { parseCsvRows, csvRowsToObjects } from './parseCsv';

describe('parseCsvRows', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsvRows('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing commas', () => {
    expect(parseCsvRows('name,addr\n"foo","서울시, 강남구"')).toEqual([
      ['name', 'addr'],
      ['foo', '서울시, 강남구'],
    ]);
  });

  it('handles escaped double quotes inside quoted fields', () => {
    expect(parseCsvRows('name\n"foo ""bar"""')).toEqual([['name'], ['foo "bar"']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ignores a trailing blank line', () => {
    expect(parseCsvRows('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('csvRowsToObjects', () => {
  it('maps rows to objects keyed by trimmed header', () => {
    const rows = [
      [' name ', 'count'],
      ['foo', '3'],
      ['bar', '1'],
    ];
    expect(csvRowsToObjects(rows)).toEqual([
      { name: 'foo', count: '3' },
      { name: 'bar', count: '1' },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(csvRowsToObjects([])).toEqual([]);
  });
});
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/stores/parseCsv.test.ts`
Expected: FAIL (`parseCsv.ts` 모듈이 없음)

- [ ] **Step 4: 구현 작성**

```ts
// lib/stores/parseCsv.ts
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body.map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      obj[key] = (row[i] ?? '').trim();
    });
    return obj;
  });
}
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/stores/parseCsv.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: 커밋**

```bash
git add lib/stores/types.ts lib/stores/parseCsv.ts lib/stores/parseCsv.test.ts
git commit -m "feat: add CSV parsing utilities for store data pipeline"
```

## Task 2: 판매점 매칭 순수 함수

**Files:**
- Create: `lib/stores/matchStores.ts`
- Test: `lib/stores/matchStores.test.ts`

**Interfaces:**
- Consumes: `WinnerRecord`, `GeocodedAddress`, `MatchResult`, `StoreWithBadge`, `AmbiguousGroup` from `lib/stores/types.ts`(Task 1).
- Produces: `matchWinnersToStores(winners: WinnerRecord[], stores: GeocodedAddress[]): MatchResult` — Task 4(조립 스크립트)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/stores/matchStores.test.ts
import { describe, it, expect } from 'vitest';
import { matchWinnersToStores } from './matchStores';
import type { GeocodedAddress, WinnerRecord } from './types';

function store(overrides: Partial<GeocodedAddress> = {}): GeocodedAddress {
  return {
    name: '행복복권방',
    roadAddress: '서울특별시 강남구 테헤란로 1',
    jibunAddress: '서울특별시 강남구 역삼동 1-1',
    lat: 37.5,
    lng: 127.0,
    ...overrides,
  };
}

function winner(overrides: Partial<WinnerRecord> = {}): WinnerRecord {
  return { name: '행복복권방', region: '서울 강남구', firstPrizeAutoCount: 3, ...overrides };
}

describe('matchWinnersToStores', () => {
  it('attaches the badge when exactly one store matches name and region', () => {
    const result = matchWinnersToStores([winner()], [store()]);
    expect(result.matched).toEqual([{ ...store(), firstPrizeAutoCount: 3 }]);
    expect(result.ambiguousGroups).toEqual([]);
    expect(result.unmatchedWinners).toEqual([]);
  });

  it('marks as ambiguous when multiple stores share the same name in the same region', () => {
    const stores = [
      store({ roadAddress: '서울특별시 강남구 테헤란로 1' }),
      store({ roadAddress: '서울특별시 강남구 테헤란로 99' }),
    ];
    const result = matchWinnersToStores([winner()], stores);
    expect(result.matched).toEqual([]);
    expect(result.ambiguousGroups).toEqual([
      { name: '행복복권방', region: '서울 강남구', firstPrizeAutoCount: 3, candidateCount: 2 },
    ]);
    expect(result.unmatchedWinners).toEqual([]);
  });

  it('marks as unmatched when no store has a matching name at all', () => {
    const result = matchWinnersToStores([winner({ name: '없는가게' })], [store()]);
    expect(result.matched).toEqual([]);
    expect(result.ambiguousGroups).toEqual([]);
    expect(result.unmatchedWinners).toEqual([winner({ name: '없는가게' })]);
  });

  it('marks as unmatched when the name matches but the region does not', () => {
    const result = matchWinnersToStores(
      [winner({ region: '부산 해운대구' })],
      [store()],
    );
    expect(result.matched).toEqual([]);
    expect(result.unmatchedWinners).toEqual([winner({ region: '부산 해운대구' })]);
  });

  it('partitions a mixed batch correctly', () => {
    const stores = [
      store({ name: 'A', roadAddress: '서울특별시 강남구 1' }),
      store({ name: 'B', roadAddress: '서울특별시 서초구 1' }),
      store({ name: 'B', roadAddress: '서울특별시 서초구 2' }),
    ];
    const winners = [
      winner({ name: 'A', region: '서울 강남구' }),
      winner({ name: 'B', region: '서울 서초구' }),
      winner({ name: 'C', region: '서울 송파구' }),
    ];
    const result = matchWinnersToStores(winners, stores);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].name).toBe('A');
    expect(result.ambiguousGroups).toHaveLength(1);
    expect(result.ambiguousGroups[0].name).toBe('B');
    expect(result.unmatchedWinners).toHaveLength(1);
    expect(result.unmatchedWinners[0].name).toBe('C');
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm run test -- lib/stores/matchStores.test.ts`
Expected: FAIL (`matchStores.ts` 모듈이 없음)

- [ ] **Step 3: 구현 작성**

```ts
// lib/stores/matchStores.ts
import type {
  AmbiguousGroup,
  GeocodedAddress,
  MatchResult,
  StoreWithBadge,
  WinnerRecord,
} from './types';

function regionMatches(region: string, store: GeocodedAddress): boolean {
  const haystack = `${store.roadAddress} ${store.jibunAddress}`;
  return region
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .every((token) => haystack.includes(token));
}

export function matchWinnersToStores(
  winners: WinnerRecord[],
  stores: GeocodedAddress[],
): MatchResult {
  const byName = new Map<string, GeocodedAddress[]>();
  for (const s of stores) {
    const list = byName.get(s.name) ?? [];
    list.push(s);
    byName.set(s.name, list);
  }

  const matched: StoreWithBadge[] = [];
  const ambiguousGroups: AmbiguousGroup[] = [];
  const unmatchedWinners: WinnerRecord[] = [];

  for (const winner of winners) {
    const nameCandidates = byName.get(winner.name) ?? [];
    const regionCandidates = nameCandidates.filter((s) => regionMatches(winner.region, s));

    if (regionCandidates.length === 1) {
      matched.push({ ...regionCandidates[0], firstPrizeAutoCount: winner.firstPrizeAutoCount });
    } else if (regionCandidates.length > 1) {
      ambiguousGroups.push({
        name: winner.name,
        region: winner.region,
        firstPrizeAutoCount: winner.firstPrizeAutoCount,
        candidateCount: regionCandidates.length,
      });
    } else {
      unmatchedWinners.push(winner);
    }
  }

  return { matched, ambiguousGroups, unmatchedWinners };
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm run test -- lib/stores/matchStores.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/stores/matchStores.ts lib/stores/matchStores.test.ts
git commit -m "feat: add winner-to-store matching logic"
```

## Task 3: 원자료 준비 + Kakao 지오코딩 스크립트

**Files:**
- Create: `scripts/geocode-kakao.ts`
- Create: `scripts/geocode-addresses.ts`
- Modify: `.env` (플레이스홀더 키 추가)

**Interfaces:**
- Produces: `geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null>` — Task 4가 사용하지 않고 `geocode-addresses.ts` 내부에서만 쓰인다(캐시 파일이 Task 4의 입력).
- Produces (파일): `data/raw/geocode-cache.json` — `{ [address: string]: { lat: number; lng: number } | null }` 형태, Task 4가 읽는다.

**사용자 작업 (코딩 태스크 시작 전 필요):**
1. [data.go.kr 1등 배출 판매점 데이터](https://www.data.go.kr/data/15059963/fileData.do)와 [판매점 주소 전체 데이터](https://www.data.go.kr/data/15086355/fileData.do)를 각각 CSV로 다운로드해서 `data/raw/winners.csv`, `data/raw/store-addresses.csv`로 저장한다.
2. [Kakao Developers](https://developers.kakao.com) 앱의 REST API 키를 확인한다(이미 앱을 만들어뒀다고 확인됨).

- [ ] **Step 1: `.env`에 플레이스홀더 추가**

`.env` 파일에 아래 줄을 추가한다(값은 비워두고, 사용자가 직접 채운다):

```
KAKAO_REST_API_KEY=
```

- [ ] **Step 2: Kakao 지오코딩 API 래퍼 작성**

```ts
// scripts/geocode-kakao.ts
// Kakao 주소검색(지오코딩) REST API 얇은 래퍼.
// https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
export interface Coordinates {
  lat: number;
  lng: number;
}

const KAKAO_ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json';

export class KakaoRateLimitError extends Error {
  constructor() {
    super('KAKAO_RATE_LIMITED');
  }
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) throw new Error('KAKAO_REST_API_KEY is not set');

  const url = `${KAKAO_ADDRESS_SEARCH_URL}?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (res.status === 429) {
    throw new KakaoRateLimitError();
  }
  if (!res.ok) {
    console.warn(`geocode failed (${res.status}): ${address}`);
    return null;
  }

  const data = (await res.json()) as { documents: { x: string; y: string }[] };
  const first = data.documents[0];
  if (!first) return null;

  // Kakao 응답은 x=경도(lng), y=위도(lat) 순서다.
  return { lat: Number(first.y), lng: Number(first.x) };
}
```

- [ ] **Step 3: 재개 가능한 배치 지오코딩 스크립트 작성**

```ts
// scripts/geocode-addresses.ts
// 사용법: npx tsx scripts/geocode-addresses.ts [limit]
// data/raw/store-addresses.csv를 읽어 도로명주소를 지오코딩하고,
// data/raw/geocode-cache.json에 이어서 저장한다(이미 캐시된 주소는 재호출하지 않는다).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsvRows, csvRowsToObjects } from '../lib/stores/parseCsv';
import { geocodeAddress, KakaoRateLimitError, type Coordinates } from './geocode-kakao';

const RAW_DIR = join(process.cwd(), 'data', 'raw');
const ADDRESS_CSV = join(RAW_DIR, 'store-addresses.csv');
const CACHE_FILE = join(RAW_DIR, 'geocode-cache.json');

function decodeCsvFile(path: string): string {
  const buffer = readFileSync(path);
  try {
    const text = new TextDecoder('euc-kr', { fatal: true }).decode(buffer);
    return text;
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function loadCache(): Record<string, Coordinates | null> {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
}

function saveCache(cache: Record<string, Coordinates | null>) {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function main() {
  const limit = Number(process.argv[2] ?? Infinity);

  const text = decodeCsvFile(ADDRESS_CSV);
  const rows = csvRowsToObjects(parseCsvRows(text));
  const cache = loadCache();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    if (processed >= limit) break;

    const roadAddress = row['도로명주소'];
    const jibunAddress = row['지번주소'];
    if (!roadAddress) continue;
    if (roadAddress in cache) continue;

    processed += 1;

    try {
      let coords = await geocodeAddress(roadAddress);
      if (!coords && jibunAddress) {
        coords = await geocodeAddress(jibunAddress);
      }
      cache[roadAddress] = coords;
      if (coords) {
        succeeded += 1;
        console.log(`[${processed}] ok: ${roadAddress}`);
      } else {
        failed += 1;
        console.warn(`[${processed}] no result: ${roadAddress}`);
      }
    } catch (err) {
      if (err instanceof KakaoRateLimitError) {
        console.warn(`quota exhausted after ${processed} requests this run — saving progress and stopping`);
        saveCache(cache);
        console.log(`done (partial): ${succeeded} succeeded, ${failed} failed, ${processed} attempted this run`);
        return;
      }
      throw err;
    }

    if (processed % 50 === 0) saveCache(cache);
    await new Promise((r) => setTimeout(r, 100));
  }

  saveCache(cache);
  console.log(`done: ${succeeded} succeeded, ${failed} failed, ${processed} attempted this run`);
}

main();
```

- [ ] **Step 4: 소규모 샘플(20건)로 수동 검증**

Run: `npx tsx scripts/geocode-addresses.ts 20`

Expected:
- 콘솔에 `[1] ok: ...`부터 `[20] ok: ...`(또는 일부 `no result`) 형태로 20건 처리 로그가 출력된다.
- `KAKAO_RATE_LIMITED` 에러 없이 완료되면 쿼터는 최소 20건 이상 여유가 있다는 뜻이다 — PRD 11절 Open Question 관련 정보로 기록해둔다.
- `data/raw/geocode-cache.json`이 생성되고, 20개 내외의 주소 키에 `{lat, lng}` 또는 `null` 값이 들어있다.
- **인코딩 확인**: `geocode-cache.json`의 주소 키가 한글로 정상 표시되는지 확인한다(깨진 문자가 보이면 `decodeCsvFile`의 EUC-KR 시도가 실패하고 UTF-8로 폴백된 것이니, 원본 CSV가 실제로 UTF-8이라는 뜻 — 정상 동작이므로 코드 수정 불필요, 그냥 결과만 확인).
- 같은 명령을 다시 실행했을 때 이미 캐시된 20건은 재호출하지 않고 즉시 `done: 0 succeeded, 0 failed, 0 attempted this run`으로 끝나는지 확인한다(재개 가능성 검증).

- [ ] **Step 5: 커밋**

```bash
git add scripts/geocode-kakao.ts scripts/geocode-addresses.ts
git commit -m "feat: add resumable Kakao geocoding script for store addresses"
```

(`.env`는 `.gitignore`로 제외되어 있어 커밋 대상에 포함되지 않는다 — Step 1에서 추가한 `KAKAO_REST_API_KEY=` 줄은 로컬에만 남는다.)

## Task 4: 전체 파이프라인 조립 스크립트

**Files:**
- Create: `scripts/build-store-data.ts`

**Interfaces:**
- Consumes: `parseCsvRows`, `csvRowsToObjects` from `lib/stores/parseCsv.ts`(Task 1); `matchWinnersToStores` from `lib/stores/matchStores.ts`(Task 2); `data/raw/geocode-cache.json`(Task 3 산출물).
- Produces (파일): `data/lotto-stores.json` — `StoreWithBadge[]`와 `ambiguousGroups`/통계를 포함한 최종 캐시. 이후 F4 UI 계획이 이 파일을 읽는다.

- [ ] **Step 1: 실제 원자료 헤더 확인**

`data/raw/winners.csv`와 `data/raw/store-addresses.csv`를 열어 첫 줄(헤더)을 확인한다. `lib/stores/matchStores.ts`와 이 스크립트가 기대하는 필드명은 `상호`/`지역`/`1등 자동 당첨 건수`(winners.csv)와 `상호`/`도로명주소`/`지번주소`(store-addresses.csv)다. 실제 헤더가 다르면(예: 공백이나 다른 표기) 아래 Step 2 코드의 필드명을 실제 값으로 맞춰서 작성한다.

- [ ] **Step 2: 조립 스크립트 작성**

```ts
// scripts/build-store-data.ts
// 사용법: npx tsx scripts/build-store-data.ts
// data/raw/winners.csv + data/raw/store-addresses.csv + data/raw/geocode-cache.json을
// 조합해 data/lotto-stores.json을 만든다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsvRows, csvRowsToObjects } from '../lib/stores/parseCsv';
import { matchWinnersToStores } from '../lib/stores/matchStores';
import type { AddressRecord, Coordinates, GeocodedAddress, WinnerRecord } from '../lib/stores/types';

const RAW_DIR = join(process.cwd(), 'data', 'raw');

function decodeCsvFile(path: string): string {
  const buffer = readFileSync(path);
  try {
    return new TextDecoder('euc-kr', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function loadWinners(): WinnerRecord[] {
  const text = decodeCsvFile(join(RAW_DIR, 'winners.csv'));
  const rows = csvRowsToObjects(parseCsvRows(text));
  return rows.map((row) => ({
    name: row['상호'],
    region: row['지역'],
    firstPrizeAutoCount: Number(row['1등 자동 당첨 건수']) || 0,
  }));
}

function loadAddresses(): AddressRecord[] {
  const text = decodeCsvFile(join(RAW_DIR, 'store-addresses.csv'));
  const rows = csvRowsToObjects(parseCsvRows(text));
  return rows.map((row) => ({
    name: row['상호'],
    roadAddress: row['도로명주소'],
    jibunAddress: row['지번주소'],
  }));
}

function loadGeocodedAddresses(addresses: AddressRecord[]): GeocodedAddress[] {
  const cachePath = join(RAW_DIR, 'geocode-cache.json');
  if (!existsSync(cachePath)) {
    throw new Error('geocode-cache.json이 없습니다 — scripts/geocode-addresses.ts를 먼저 실행하세요.');
  }
  const cache: Record<string, Coordinates | null> = JSON.parse(readFileSync(cachePath, 'utf-8'));

  const geocoded: GeocodedAddress[] = [];
  let missing = 0;
  for (const addr of addresses) {
    const coords = cache[addr.roadAddress] ?? (addr.jibunAddress ? cache[addr.jibunAddress] : undefined);
    if (!coords) {
      missing += 1;
      continue;
    }
    geocoded.push({ ...addr, lat: coords.lat, lng: coords.lng });
  }
  console.log(`geocoded: ${geocoded.length}, missing from cache: ${missing}`);
  return geocoded;
}

function main() {
  const winners = loadWinners();
  const addresses = loadAddresses();
  const geocoded = loadGeocodedAddresses(addresses);

  const { matched, ambiguousGroups, unmatchedWinners } = matchWinnersToStores(winners, geocoded);

  const badgeByKey = new Map(matched.map((s) => [`${s.name}|${s.roadAddress}`, s.firstPrizeAutoCount]));
  const output = geocoded.map((s) => ({
    ...s,
    firstPrizeAutoCount: badgeByKey.get(`${s.name}|${s.roadAddress}`) ?? null,
  }));

  writeFileSync(join(process.cwd(), 'data', 'lotto-stores.json'), JSON.stringify(output, null, 2));

  console.log(`done: ${output.length} stores written to data/lotto-stores.json`);
  console.log(`  matched with badge: ${matched.length}`);
  console.log(`  ambiguous (no badge attached): ${ambiguousGroups.length}`);
  console.log(`  unmatched winners: ${unmatchedWinners.length}`);
}

main();
```

- [ ] **Step 3: `Coordinates` 타입을 공유 타입 파일로 이동**

`scripts/geocode-kakao.ts`의 `Coordinates` 인터페이스를 `lib/stores/types.ts`로 옮기고(Task 1에서 만든 파일에 추가), `scripts/geocode-kakao.ts`와 `scripts/geocode-addresses.ts`, `scripts/build-store-data.ts`가 모두 `../lib/stores/types`에서 `Coordinates`를 import하도록 통일한다:

```ts
// lib/stores/types.ts에 추가
export interface Coordinates {
  lat: number;
  lng: number;
}
```

`scripts/geocode-kakao.ts`에서 로컬 `Coordinates` 인터페이스 정의를 지우고 `import type { Coordinates } from '../lib/stores/types';`로 교체한다.

`scripts/geocode-addresses.ts`의 import 줄도 함께 고친다 — 기존:
```ts
import { geocodeAddress, KakaoRateLimitError, type Coordinates } from './geocode-kakao';
```
다음으로 교체:
```ts
import { geocodeAddress, KakaoRateLimitError } from './geocode-kakao';
import type { Coordinates } from '../lib/stores/types';
```

- [ ] **Step 4: 소규모 샘플로 수동 검증**

Task 3에서 만든 20건 캐시만으로는 `winners.csv`(463건)와 이름이 겹칠 확률이 낮으므로, 먼저 캐시를 늘린다:

Run: `npx tsx scripts/geocode-addresses.ts 300`

Expected: 캐시가 300건 내외로 늘어난다(이미 캐시된 20건은 건너뛰므로 실제로는 약 280건 신규 처리).

그다음 조립 스크립트를 실행한다:

Run: `npx tsx scripts/build-store-data.ts`

Expected:
- `geocoded: N, missing from cache: M` 로그(N+M ≈ 8,802, N은 이번에 지오코딩된 만큼만).
- `done: N stores written to data/lotto-stores.json` 로그와 매칭 통계(`matched with badge`, `ambiguous`, `unmatched winners`) 출력.
- `data/lotto-stores.json`을 열어 배열 형태이고, 각 항목이 `name`/`roadAddress`/`jibunAddress`/`lat`/`lng`/`firstPrizeAutoCount`(숫자 또는 `null`) 필드를 가지는지 확인한다.
- `firstPrizeAutoCount`가 숫자인 항목이 최소 1개 이상 있는지 확인한다(300건 샘플 안에 463개 배출 판매점 중 하나 이상 이름이 겹칠 가능성이 높지만, 겹치지 않으면 전부 `null`이어도 이 단계에서는 실패로 보지 않는다 — 전체 배치를 돌려야 실질적인 매칭이 이뤄진다).

- [ ] **Step 5: 커밋**

```bash
git add scripts/build-store-data.ts lib/stores/types.ts scripts/geocode-kakao.ts
git commit -m "feat: add store data pipeline assembly script"
```

## Task 5: 전체 검증

- [ ] **Step 1: 전체 테스트 스위트 실행 (회귀 확인)**

Run: `npm run test`
Expected: 기존 테스트 전부 PASS + 이번에 추가한 `parseCsv.test.ts`(7개) + `matchStores.test.ts`(5개) = 이전 42개 + 12개 = 54개 PASS.

- [ ] **Step 2: 린트/타입체크 확인**

Run: `npm run lint && npx tsc --noEmit`
Expected: 에러 없이 완료.

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: verify F4 store data pipeline tests and lint pass" --allow-empty
```

---

## 이 계획 밖의 후속 작업 (사용자가 직접 진행)

이 계획은 300건 규모 샘플로 파이프라인 정확성만 검증한다. 실제 서비스에 쓸 전체 8,802건 지오코딩은 카카오 쿼터 상황에 따라 하루 이상 걸릴 수 있어 별도 작업으로 분리한다:

1. `npx tsx scripts/geocode-addresses.ts`를 인자 없이(=전체) 실행한다. `KAKAO_RATE_LIMITED`로 중간에 멈추면, 다음 날(또는 쿼터가 리셋되는 시점) 같은 명령을 다시 실행하면 캐시된 항목은 건너뛰고 이어서 처리한다.
2. 전체 캐시가 다 채워지면 `npx tsx scripts/build-store-data.ts`를 다시 실행해 `data/lotto-stores.json`을 최종 데이터로 갱신하고, 출력된 매칭 통계(특히 `ambiguous`, `unmatched winners` 건수)를 확인해 PRD 11절 Open Question("F4 매칭 모호 케이스 UX")을 결정하는 데 참고한다.
3. 최종 `data/lotto-stores.json`과 `data/raw/geocode-cache.json`을 커밋한다(대용량이면 `.gitignore` 여부를 이 시점에 재검토).
4. F4 지도/리스트 UI 구현 계획은 이 최종 데이터가 준비된 뒤 별도로 작성한다.
