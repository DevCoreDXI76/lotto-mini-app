'use client';

import { useState } from 'react';
import type { NumberActivity } from '@/lib/lotto/analysis';

function colorFor(n: number): string {
  if (n <= 15) return 'bg-[#ca8a04]';
  if (n <= 30) return 'bg-[#3b82f6]';
  return 'bg-[#ef4444]';
}

function tooltipPositionClass(n: number): string {
  if (n <= 3) return 'left-0 translate-x-0';
  if (n >= 43) return 'left-auto right-0 translate-x-0';
  return 'left-1/2 -translate-x-1/2';
}

export function ActivityChart({
  activity,
  highlighted = [],
}: {
  activity: NumberActivity[];
  highlighted?: number[];
}) {
  const [hovered, setHovered] = useState<NumberActivity | null>(null);
  const highlightedSet = new Set(highlighted);

  return (
    <div className="rounded-xl p-4 bg-white shadow-sm">
      <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <h3 className="font-semibold text-sm">번호별 활성도 분포 (1~45)</h3>
        <span className="text-xs font-medium text-gray-500 tabular-nums whitespace-nowrap">
          {hovered ? `${hovered.number}번 · 활성도 ${Math.round(hovered.score * 100)}%` : '막대에 마우스를 올려보세요'}
        </span>
      </div>
      <div
        className="flex items-end gap-[2px] h-32"
        role="img"
        aria-label="번호별 활성도 막대그래프. 막대가 높을수록 선택한 전략에서 가중치가 높은 번호입니다."
      >
        {activity.map((a) => (
          <div
            key={a.number}
            className="relative flex-1 h-full flex flex-col justify-end cursor-default"
            onMouseEnter={() => setHovered(a)}
            onMouseLeave={() => setHovered((h) => (h?.number === a.number ? null : h))}
            aria-label={`${a.number}번 활성도 ${Math.round(a.score * 100)}퍼센트${
              highlightedSet.has(a.number) ? ', 최종 조합 후보 포함' : ''
            }`}
          >
            {hovered?.number === a.number && (
              <div
                className={`absolute -top-7 whitespace-nowrap rounded bg-gray-900 text-white text-[10px] px-1.5 py-0.5 shadow-md z-10 ${tooltipPositionClass(a.number)}`}
              >
                {a.number}번 · {Math.round(a.score * 100)}%
              </div>
            )}
            <div
              className={`w-full rounded-t transition-opacity ${
                highlightedSet.has(a.number) ? 'bg-[#4f46e5]' : colorFor(a.number)
              } ${hovered && hovered.number !== a.number ? 'opacity-40' : ''}`}
              style={{ height: `${Math.max(a.score * 100, 4)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>1</span>
        <span>15</span>
        <span>30</span>
        <span>45</span>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#ca8a04]" aria-hidden="true" /> 1~15
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" aria-hidden="true" /> 16~30
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" aria-hidden="true" /> 31~45
        </span>
        {highlighted.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#4f46e5]" aria-hidden="true" /> 최종 조합 후보
          </span>
        )}
      </div>
    </div>
  );
}
