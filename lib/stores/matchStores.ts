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
