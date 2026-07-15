export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WinnerRecord {
  name: string;
  region: string;
  firstPrizeAutoCount: number;
}

export interface AddressRecord {
  name: string;
  roadAddress: string;
  jibunAddress: string;
}

export interface GeocodedAddress extends AddressRecord {
  lat: number;
  lng: number;
}

export interface StoreWithBadge extends GeocodedAddress {
  firstPrizeAutoCount: number;
}

export interface AmbiguousGroup {
  name: string;
  region: string;
  firstPrizeAutoCount: number;
  candidateCount: number;
}

export interface MatchResult {
  matched: StoreWithBadge[];
  ambiguousGroups: AmbiguousGroup[];
  unmatchedWinners: WinnerRecord[];
}
