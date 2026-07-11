'use client';

import { useState } from 'react';
import type { FrequencyRankEntry } from '@/lib/lotto/stats';

export function FullRankingToggle({ entries }: { entries: FrequencyRankEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-sm text-gray-500 py-2"
      >
        {expanded ? '접기' : '전체 1~45번 순위 펼쳐보기'}
      </button>
      {expanded && (
        <table className="w-full text-sm" aria-label="전체 45개 번호 출현 순위표">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">순위</th>
              <th className="py-1">번호</th>
              <th className="py-1">출현 횟수</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.number} className="border-t">
                <td className="py-1">{entry.rank}</td>
                <td className="py-1">{entry.number}</td>
                <td className="py-1">{entry.count}회</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
