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
