// components/lotto/ResultIndexList.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

const PAGE_SIZE = 50;

export function ResultIndexList({ draws }: { draws: { drawNumber: number; date: string }[] }) {
  // Unlike StoreListView's client-filtered/sorted list, `draws` is computed once in a
  // server component and never changes reference or becomes empty, so no
  // reset-on-prop-change guard or empty-state branch is needed here.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = draws.slice(0, visibleCount);
  const remaining = draws.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((draw) => (
        <Link
          key={draw.drawNumber}
          href={`/result/${draw.drawNumber}`}
          className="flex justify-between items-center bg-white rounded-lg shadow-sm px-4 py-3 text-sm hover:shadow"
        >
          <span className="font-semibold">{draw.drawNumber}회</span>
          <span className="text-gray-500">{draw.date}</span>
        </Link>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="w-full text-sm text-gray-500 py-2"
        >
          {remaining}개 더 보기
        </button>
      )}
    </div>
  );
}
