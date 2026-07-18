'use client';

import { useState } from 'react';
import { StoreCard } from './StoreCard';
import type { StoreWithBadge } from '@/lib/stores/types';

const PAGE_SIZE = 50;

export function StoreListView({
  stores,
  userPosition,
}: {
  stores: StoreWithBadge[];
  userPosition: { lat: number; lng: number } | null;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevStores, setPrevStores] = useState(stores);

  // stores is a new array reference (from useMemo upstream) whenever
  // sort/filter/location changes — reset pagination during render so the
  // new list doesn't stay clipped at whatever page the old list was on.
  if (stores !== prevStores) {
    setPrevStores(stores);
    setVisibleCount(PAGE_SIZE);
  }

  if (stores.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">해당 지역에 표시할 판매점이 없습니다.</p>;
  }

  const visible = stores.slice(0, visibleCount);
  const remaining = stores.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((store) => (
        <StoreCard key={`${store.name}-${store.roadAddress}`} store={store} userPosition={userPosition} />
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full text-sm text-gray-500 py-2"
        >
          {remaining}개 더 보기
        </button>
      )}
    </div>
  );
}
