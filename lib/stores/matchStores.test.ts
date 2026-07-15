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
