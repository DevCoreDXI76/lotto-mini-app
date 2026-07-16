import type { StoreWithBadge } from './types';

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}

export function extractRegion(roadAddress: string): string {
  return roadAddress.trim().split(/\s+/)[0] ?? '';
}

export function extractRegions(stores: Pick<StoreWithBadge, 'roadAddress'>[]): string[] {
  const set = new Set(stores.map((s) => extractRegion(s.roadAddress)).filter(Boolean));
  return Array.from(set).sort();
}

export function sortStoresByCount(stores: StoreWithBadge[]): StoreWithBadge[] {
  return [...stores].sort((a, b) => (b.firstPrizeAutoCount ?? 0) - (a.firstPrizeAutoCount ?? 0));
}

export function sortStoresByDistance(
  stores: StoreWithBadge[],
  origin: { lat: number; lng: number },
): StoreWithBadge[] {
  return [...stores].sort(
    (a, b) => haversineDistanceKm(origin, a) - haversineDistanceKm(origin, b),
  );
}

export function filterStoresByRegion(stores: StoreWithBadge[], region: string): StoreWithBadge[] {
  return stores.filter((s) => extractRegion(s.roadAddress) === region);
}
