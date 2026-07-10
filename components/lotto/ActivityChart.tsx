'use client';

import type { NumberActivity } from '@/lib/lotto/analysis';

function colorFor(n: number): string {
  if (n <= 15) return 'bg-[#ca8a04]';
  if (n <= 30) return 'bg-[#3b82f6]';
  return 'bg-[#ef4444]';
}

export function ActivityChart({
  activity,
  highlighted = [],
}: {
  activity: NumberActivity[];
  highlighted?: number[];
}) {
  const highlightedSet = new Set(highlighted);

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-3">번호별 활성도 분포 (1~45)</h3>
      <div
        className="flex items-end gap-[2px] h-32"
        role="img"
        aria-label="번호별 활성도 막대그래프. 막대가 높을수록 선택한 전략에서 가중치가 높은 번호입니다."
      >
        {activity.map(({ number, score }) => (
          <div
            key={number}
            className="flex-1 h-full flex flex-col justify-end"
            aria-label={`${number}번 활성도 ${Math.round(score * 100)}퍼센트${
              highlightedSet.has(number) ? ', 최종 조합 후보 포함' : ''
            }`}
          >
            <div
              className={`w-full rounded-t ${highlightedSet.has(number) ? 'bg-[#4f46e5]' : colorFor(number)}`}
              style={{ height: `${Math.max(score * 100, 4)}%` }}
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
