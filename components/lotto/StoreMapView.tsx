import type { StoreWithBadge } from '@/lib/stores/types';

export function StoreMapView({
  stores,
  userPosition,
}: {
  stores: StoreWithBadge[];
  userPosition: { lat: number; lng: number } | null;
}) {
  void stores;
  void userPosition;
  return (
    <div className="w-full h-[60vh] rounded-xl bg-white shadow-sm flex items-center justify-center text-sm text-gray-400">
      지도 뷰 준비 중입니다.
    </div>
  );
}
