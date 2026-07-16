import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  extractRegion,
  extractRegions,
  sortStoresByCount,
  sortStoresByDistance,
  filterStoresByRegion,
} from './distance';
import type { StoreWithBadge } from './types';

describe('haversineDistanceKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistanceKm({ lat: 37.5665, lng: 126.978 }, { lat: 37.5665, lng: 126.978 })).toBe(0);
  });

  it('computes ~111.2km for 1 degree of longitude at the equator', () => {
    const d = haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('is symmetric', () => {
    const a = { lat: 37.5, lng: 127.0 };
    const b = { lat: 35.2, lng: 129.1 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });
});

describe('extractRegion', () => {
  it('extracts the leading whitespace-separated token', () => {
    expect(extractRegion('서울특별시 강남구 테헤란로 1')).toBe('서울특별시');
  });

  it('returns an empty string for an empty address', () => {
    expect(extractRegion('')).toBe('');
  });
});

describe('extractRegions', () => {
  it('returns unique sorted regions from a store list', () => {
    const stores = [
      { roadAddress: '서울특별시 강남구 1' },
      { roadAddress: '부산광역시 해운대구 1' },
      { roadAddress: '서울특별시 서초구 1' },
    ] as StoreWithBadge[];
    expect(extractRegions(stores)).toEqual(['부산광역시', '서울특별시']);
  });
});

function store(overrides: Partial<StoreWithBadge> = {}): StoreWithBadge {
  return {
    name: '테스트복권방',
    roadAddress: '서울특별시 강남구 1',
    jibunAddress: '서울특별시 강남구 1-1',
    lat: 37.5,
    lng: 127.0,
    firstPrizeAutoCount: null,
    ...overrides,
  };
}

describe('sortStoresByCount', () => {
  it('sorts descending by firstPrizeAutoCount, treating null as 0', () => {
    const stores = [
      store({ name: 'A', firstPrizeAutoCount: 1 }),
      store({ name: 'B', firstPrizeAutoCount: null }),
      store({ name: 'C', firstPrizeAutoCount: 5 }),
    ];
    expect(sortStoresByCount(stores).map((s) => s.name)).toEqual(['C', 'A', 'B']);
  });

  it('does not mutate the input array', () => {
    const stores = [store({ name: 'A', firstPrizeAutoCount: 1 }), store({ name: 'B', firstPrizeAutoCount: 5 })];
    const original = [...stores];
    sortStoresByCount(stores);
    expect(stores).toEqual(original);
  });
});

describe('sortStoresByDistance', () => {
  it('sorts ascending by distance from the origin', () => {
    const near = store({ name: 'near', lat: 37.5, lng: 127.0 });
    const far = store({ name: 'far', lat: 35.2, lng: 129.1 });
    const result = sortStoresByDistance([far, near], { lat: 37.5, lng: 127.0 });
    expect(result.map((s) => s.name)).toEqual(['near', 'far']);
  });
});

describe('filterStoresByRegion', () => {
  it('keeps only stores whose leading address token matches the region', () => {
    const stores = [
      store({ name: 'A', roadAddress: '서울특별시 강남구 1' }),
      store({ name: 'B', roadAddress: '부산광역시 해운대구 1' }),
    ];
    expect(filterStoresByRegion(stores, '서울특별시').map((s) => s.name)).toEqual(['A']);
  });
});
