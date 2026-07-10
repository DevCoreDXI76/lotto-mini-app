'use client';

import { NumberBall } from './NumberBall';
import { useLatestDraw } from '@/lib/lotto/useLatestDraw';

export function LatestDraw() {
  const data = useLatestDraw();

  if (!data) return <p className="text-sm text-gray-400">직전 회차 정보를 불러오는 중입니다...</p>;

  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-gray-500">
        {data.draw.drawNumber}회 ({data.draw.date}){' '}
        {data.source === 'cache' && '· 최신 정보를 불러오지 못해 캐시된 결과를 표시합니다'}
      </p>
      <div className="flex items-center gap-1 mt-2">
        {data.draw.numbers.map((n) => (
          <NumberBall key={n} n={n} />
        ))}
        <span className="mx-1 text-gray-400">+</span>
        <NumberBall n={data.draw.bonusNumber} />
      </div>
    </div>
  );
}
