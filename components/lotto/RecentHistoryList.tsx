'use client';

import { useState } from 'react';
import { NumberBall } from './NumberBall';
import { STRATEGIES } from '@/lib/lotto/types';
import type { HistoryEntry } from '@/lib/lotto/recentHistory';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [copied, setCopied] = useState(false);
  const label = STRATEGIES.find((s) => s.id === entry.strategy)?.label ?? entry.strategy;

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.numbers.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl p-3 bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {entry.numbers.map((n) => (
            <NumberBall key={n} n={n} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3">
        <span className="text-xs text-gray-400">
          {label} · {formatTime(entry.timestamp)}
        </span>
        <button
          onClick={handleCopy}
          className="text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 whitespace-nowrap shrink-0"
          type="button"
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}

export function RecentHistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-sm">최근 생성 기록</h2>
      {entries.map((entry, i) => (
        <HistoryRow key={`${entry.timestamp}-${i}`} entry={entry} />
      ))}
    </div>
  );
}
