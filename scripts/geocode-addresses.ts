// 사용법: npx tsx scripts/geocode-addresses.ts [limit]
// data/raw/store-addresses.csv를 읽어 도로명주소를 지오코딩하고,
// data/raw/geocode-cache.json에 이어서 저장한다(이미 캐시된 주소는 재호출하지 않는다).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsvRows, csvRowsToObjects } from '../lib/stores/parseCsv';
import { geocodeAddress, KakaoRateLimitError, KakaoAuthError, type Coordinates } from './geocode-kakao';

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
      if (err instanceof KakaoAuthError) {
        console.error(
          `Kakao API authentication failed (${err.message}) — check that KAKAO_REST_API_KEY in .env is the REST API key (not Admin/JavaScript key), and that the 카카오맵 product is enabled for the Kakao app. Saving progress and stopping without marking this address as failed.`,
        );
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
