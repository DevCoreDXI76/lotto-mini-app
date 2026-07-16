'use client';

import { useState } from 'react';
import type { StoreWithBadge } from '@/lib/stores/types';
import { haversineDistanceKm } from '@/lib/stores/distance';

export function StoreCard({
  store,
  userPosition,
}: {
  store: StoreWithBadge;
  userPosition: { lat: number; lng: number } | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const distanceLabel = userPosition
    ? `${haversineDistanceKm(userPosition, store).toFixed(1)}km`
    : null;

  const directionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.lat},${store.lng}`;

  return (
    <div className="rounded-xl bg-white shadow-sm p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold truncate">{store.name}</p>
          <p className="text-xs text-gray-400 truncate">{distanceLabel ?? store.roadAddress}</p>
        </div>
        {store.firstPrizeAutoCount !== null && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
            1등 {store.firstPrizeAutoCount}회 배출
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm text-gray-600">
          <p>{store.roadAddress}</p>
          {store.firstPrizeAutoCount !== null && (
            <p className="text-xs text-gray-400">
              자동선택 당첨 기준입니다. 특정 판매점 이용이 당첨 확률에 영향을 주지 않습니다.
            </p>
          )}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            길찾기
          </a>
        </div>
      )}
    </div>
  );
}
