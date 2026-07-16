import type { Strategy } from './types';

export interface HistoryEntry {
  numbers: number[];
  strategy: Strategy;
  timestamp: number;
}

export const MAX_HISTORY_ENTRIES = 20;

const CURRENT_STRATEGIES: readonly Strategy[] = ['frequency', 'elite', 'balanced', 'cold', 'random'];

// Strategy ids retired by the F1 rich-UI redesign (2026-07-10), mapped to
// their closest surviving equivalent so entries saved before the rename
// don't show a raw, meaningless id.
const RETIRED_STRATEGY_MAP: Record<string, Strategy> = {
  carryover: 'frequency',
};

export function migrateHistoryEntries(entries: unknown[]): HistoryEntry[] {
  const migrated: HistoryEntry[] = [];
  for (const entry of entries) {
    const raw = entry as { strategy?: string };
    const mapped = RETIRED_STRATEGY_MAP[raw.strategy ?? ''];
    if (mapped) {
      migrated.push({ ...(entry as HistoryEntry), strategy: mapped });
    } else if (CURRENT_STRATEGIES.includes(raw.strategy as Strategy)) {
      migrated.push(entry as HistoryEntry);
    }
    // unrecognized ids are dropped rather than guessed at
  }
  return migrated;
}

export function prependEntries(
  current: HistoryEntry[],
  newEntries: HistoryEntry[],
): HistoryEntry[] {
  return [...newEntries, ...current].slice(0, MAX_HISTORY_ENTRIES);
}
