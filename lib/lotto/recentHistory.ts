import type { Strategy } from './types';

export interface HistoryEntry {
  numbers: number[];
  strategy: Strategy;
  timestamp: number;
}

export const MAX_HISTORY_ENTRIES = 20;

export function prependEntries(
  current: HistoryEntry[],
  newEntries: HistoryEntry[],
): HistoryEntry[] {
  return [...newEntries, ...current].slice(0, MAX_HISTORY_ENTRIES);
}
