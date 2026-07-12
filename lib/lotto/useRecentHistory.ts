'use client';

import { useEffect, useState } from 'react';
import { prependEntries, type HistoryEntry } from './recentHistory';
import type { GeneratedGame, Strategy } from './types';

const STORAGE_KEY = 'lotto-recent-history';

function loadEntries(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

export function useRecentHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    // localStorage isn't available during server rendering, so the initial
    // load can only happen client-side after mount — same one-time browser-API
    // sync as FirstVisitNotice.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
  }, []);

  function addGames(games: GeneratedGame[], strategy: Strategy) {
    const timestamp = Date.now();
    const newEntries: HistoryEntry[] = games.map((g) => ({
      numbers: g.numbers,
      strategy,
      timestamp,
    }));
    setEntries((current) => {
      const updated = prependEntries(current, newEntries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return { entries, addGames };
}
