import { StoreCard } from './StoreCard';
import type { StoreWithBadge } from '@/lib/stores/types';

export function StoreListView({
  stores,
  userPosition,
}: {
  stores: StoreWithBadge[];
  userPosition: { lat: number; lng: number } | null;
}) {
  if (stores.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">해당 지역에 표시할 판매점이 없습니다.</p>;
  }

  return (
    <div className="space-y-2">
      {stores.map((store) => (
        <StoreCard key={`${store.name}-${store.roadAddress}`} store={store} userPosition={userPosition} />
      ))}
    </div>
  );
}
