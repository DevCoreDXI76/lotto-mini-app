'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoreWithBadge } from '@/lib/stores/types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- opaque nominal handle for kakao.maps.LatLng
interface KakaoLatLng {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- opaque nominal handle for kakao.maps.Map
interface KakaoMap {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- opaque nominal handle for kakao.maps.Marker
interface KakaoMarker {}
interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
}
interface KakaoMarkerClusterer {
  addMarkers: (markers: KakaoMarker[]) => void;
  clear: () => void;
}
interface KakaoMapsNamespace {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { position: KakaoLatLng }) => KakaoMarker;
  InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
  MarkerClusterer: new (options: {
    map: KakaoMap;
    averageCenter: boolean;
    minLevel: number;
  }) => KakaoMarkerClusterer;
  event: { addListener: (target: KakaoMarker, type: string, handler: () => void) => void };
  load: (callback: () => void) => void;
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsNamespace };
  }
}

const KAKAO_SDK_ID = 'kakao-maps-sdk';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadKakaoMapsSdk(appKey: string): Promise<KakaoMapsNamespace> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao.maps);
      return;
    }
    const existing = document.getElementById(KAKAO_SDK_ID);
    if (existing) {
      existing.addEventListener('load', () => window.kakao!.maps.load(() => resolve(window.kakao!.maps)));
      return;
    }
    const script = document.createElement('script');
    script.id = KAKAO_SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=clusterer&autoload=false`;
    script.onload = () => window.kakao!.maps.load(() => resolve(window.kakao!.maps));
    script.onerror = () => reject(new Error('Kakao Maps SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

export function StoreMapView({
  stores,
  userPosition,
}: {
  stores: StoreWithBadge[];
  userPosition: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!appKey || !container) return;

    let cancelled = false;
    const created: { clusterer: KakaoMarkerClusterer | null } = { clusterer: null };

    loadKakaoMapsSdk(appKey)
      .then((kakaoMaps) => {
        if (cancelled) return;

        setLoadError(null);

        const center = userPosition
          ? new kakaoMaps.LatLng(userPosition.lat, userPosition.lng)
          : new kakaoMaps.LatLng(37.5665, 126.978);

        const map = new kakaoMaps.Map(container, { center, level: 7 });

        const markers = stores.map((store) => {
          const marker = new kakaoMaps.Marker({
            position: new kakaoMaps.LatLng(store.lat, store.lng),
          });

          const badgeLine =
            store.firstPrizeAutoCount !== null
              ? `1등 ${store.firstPrizeAutoCount}회 배출<br/><span style="font-size:11px;color:#9ca3af;">자동선택 당첨 기준입니다. 특정 판매점 이용이 당첨 확률에 영향을 주지 않습니다.</span><br/>`
              : '';
          const directionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.lat},${store.lng}`;
          const infoWindow = new kakaoMaps.InfoWindow({
            content: `<div style="padding:8px;font-size:12px;"><strong>${escapeHtml(store.name)}</strong><br/>${badgeLine}<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">길찾기</a></div>`,
          });

          kakaoMaps.event.addListener(marker, 'click', () => {
            infoWindow.open(map, marker);
          });

          return marker;
        });

        const clusterer = new kakaoMaps.MarkerClusterer({ map, averageCenter: true, minLevel: 6 });
        clusterer.addMarkers(markers);
        created.clusterer = clusterer;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : '지도를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
      created.clusterer?.clear();
      container.innerHTML = '';
    };
  }, [stores, userPosition, appKey]);

  if (!appKey) {
    return (
      <div className="w-full h-[60vh] rounded-xl bg-white shadow-sm flex items-center justify-center text-sm text-gray-400 text-center px-4">
        지도를 표시하려면 NEXT_PUBLIC_KAKAO_JS_KEY 환경변수가 필요합니다.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-[60vh] rounded-xl bg-white shadow-sm flex items-center justify-center text-sm text-gray-400 text-center px-4">
        {loadError}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-[60vh] rounded-xl overflow-hidden shadow-sm" />;
}
