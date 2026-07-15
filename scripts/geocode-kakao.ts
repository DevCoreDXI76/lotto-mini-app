// Kakao 주소검색(지오코딩) REST API 얇은 래퍼.
// https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
export interface Coordinates {
  lat: number;
  lng: number;
}

const KAKAO_ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json';

export class KakaoRateLimitError extends Error {
  constructor() {
    super('KAKAO_RATE_LIMITED');
  }
}

export class KakaoAuthError extends Error {
  constructor(status: number) {
    super(`KAKAO_AUTH_ERROR_${status}`);
  }
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) throw new Error('KAKAO_REST_API_KEY is not set');

  const url = `${KAKAO_ADDRESS_SEARCH_URL}?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (res.status === 429) {
    throw new KakaoRateLimitError();
  }
  if (res.status === 401 || res.status === 403) {
    throw new KakaoAuthError(res.status);
  }
  if (!res.ok) {
    console.warn(`geocode failed (${res.status}): ${address}`);
    return null;
  }

  const data = (await res.json()) as { documents: { x: string; y: string }[] };
  const first = data.documents[0];
  if (!first) return null;

  // Kakao 응답은 x=경도(lng), y=위도(lat) 순서다.
  return { lat: Number(first.y), lng: Number(first.x) };
}
