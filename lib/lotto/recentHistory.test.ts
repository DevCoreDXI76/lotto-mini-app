import { describe, it, expect } from 'vitest';
import { prependEntries, MAX_HISTORY_ENTRIES } from './recentHistory';
import type { HistoryEntry } from './recentHistory';

function makeEntry(n: number): HistoryEntry {
  return { numbers: [n], strategy: 'random', timestamp: n };
}

describe('prependEntries', () => {
  it("adds new entries before existing ones, preserving the new entries' given order", () => {
    const current = [makeEntry(1), makeEntry(2)];
    const incoming = [makeEntry(10), makeEntry(11)];
    const result = prependEntries(current, incoming);
    expect(result).toEqual([makeEntry(10), makeEntry(11), makeEntry(1), makeEntry(2)]);
  });

  it('caps the result at MAX_HISTORY_ENTRIES, dropping the oldest (tail) entries', () => {
    const current = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, i) => makeEntry(i));
    const incoming = [makeEntry(100)];
    const result = prependEntries(current, incoming);
    expect(result).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(result[0]).toEqual(makeEntry(100));
    expect(result[result.length - 1]).toEqual(makeEntry(MAX_HISTORY_ENTRIES - 2));
  });

  it('returns just the new entries when current is empty', () => {
    const result = prependEntries([], [makeEntry(1)]);
    expect(result).toEqual([makeEntry(1)]);
  });
});
