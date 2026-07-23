'use client';

import { useMemo, useState } from 'react';
import storesData from '@/data/lotto-stores.json';
import type { StoreWithBadge } from '@/lib/stores/types';
import {
  extractRegions,
  filterStoresByRegion,
  sortStoresByCount,
  sortStoresByDistance,
} from '@/lib/stores/distance';
import { StoreListView } from '@/components/lotto/StoreListView';
import { StoreMapView } from '@/components/lotto/StoreMapView';

const stores = storesData as StoreWithBadge[];

type LocationStatus = 'idle' | 'granted' | 'denied' | 'unsupported';

export function StoresClient() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'count'>('count');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const regions = useMemo(() => extractRegions(stores), []);

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
        setSortBy('distance');
      },
      () => {
        setLocationStatus('denied');
      },
    );
  }

  const visibleStores = useMemo(() => {
    let result = stores;
    if (locationStatus !== 'granted' && regionFilter) {
      result = filterStoresByRegion(result, regionFilter);
    }
    if (sortBy === 'distance' && userPosition) {
      return sortStoresByDistance(result, userPosition);
    }
    return sortStoresByCount(result);
  }, [locationStatus, regionFilter, sortBy, userPosition]);

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <h1 className="text-2xl font-bold">판매점 찾기</h1>

        <p className="text-xs text-gray-500">
          판매점 목록은 2025-06-07 기준이며, 폐업·신규 매장이 반영되지 않았을 수 있습니다. 1등 배출 이력은
          2025년 6월 기준입니다.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex-1 py-2 rounded-lg text-sm transition-shadow ${view === 'list' ? 'bg-black text-white shadow-md' : 'bg-white shadow-sm hover:shadow'}`}
          >
            리스트 뷰
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={`flex-1 py-2 rounded-lg text-sm transition-shadow ${view === 'map' ? 'bg-black text-white shadow-md' : 'bg-white shadow-sm hover:shadow'}`}
          >
            지도 뷰
          </button>
        </div>

        {locationStatus === 'granted' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSortBy('distance')}
              className={`flex-1 py-2 rounded-lg text-sm ${sortBy === 'distance' ? 'bg-black text-white' : 'bg-white shadow-sm'}`}
            >
              거리순
            </button>
            <button
              type="button"
              onClick={() => setSortBy('count')}
              className={`flex-1 py-2 rounded-lg text-sm ${sortBy === 'count' ? 'bg-black text-white' : 'bg-white shadow-sm'}`}
            >
              배출횟수순
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={requestLocation}
            className="w-full py-2 rounded-lg text-sm bg-white shadow-sm hover:shadow"
          >
            내 위치로 정렬
          </button>
        )}

        {(locationStatus === 'denied' || locationStatus === 'unsupported') && (
          <select
            value={regionFilter ?? ''}
            onChange={(e) => setRegionFilter(e.target.value || null)}
            className="w-full bg-white rounded-lg px-3 py-2 text-sm shadow-inner"
          >
            <option value="">전체 지역</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        {view === 'list' ? (
          <StoreListView stores={visibleStores} userPosition={userPosition} />
        ) : (
          <StoreMapView stores={visibleStores} userPosition={userPosition} />
        )}
      </div>
    </main>
  );
}
