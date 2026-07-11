import type { StrategyMeta } from '@/lib/lotto/types';

export function AlgorithmSummaryCard({
  strategy,
  topNumbers,
}: {
  strategy: StrategyMeta;
  topNumbers: number[];
}) {
  const conditions = strategy.conditions;
  const oddCount = topNumbers.filter((n) => n % 2 === 1).length;
  const evenCount = topNumbers.length - oddCount;
  const lowCount = topNumbers.filter((n) => n <= 15).length;
  const midCount = topNumbers.filter((n) => n > 15 && n <= 30).length;
  const highCount = topNumbers.filter((n) => n > 30).length;

  return (
    <div
      className="rounded-xl p-4 bg-white shadow-sm"
      aria-label={`적용 알고리즘: ${strategy.label}, ${strategy.formula}`}
    >
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
        <span aria-hidden="true">📊</span> 종합 적용 알고리즘
      </h3>
      <ul className="space-y-1.5">
        <li className="flex items-start gap-1.5 text-sm text-gray-700">
          <span className="text-emerald-600 shrink-0" aria-hidden="true">
            ✓
          </span>
          <span>
            <span className="text-gray-500">가중 전략:</span> {strategy.icon} {strategy.label} — {strategy.formula}
          </span>
        </li>
        <li className="flex items-start gap-1.5 text-sm text-gray-700">
          <span className="text-emerald-600 shrink-0" aria-hidden="true">
            ✓
          </span>
          <span>
            <span className="text-gray-500">홀짝 비율:</span> {oddCount}:{evenCount} (활성도 상위 {topNumbers.length}
            수 기준)
          </span>
        </li>
        <li className="flex items-start gap-1.5 text-sm text-gray-700">
          <span className="text-emerald-600 shrink-0" aria-hidden="true">
            ✓
          </span>
          <span>
            <span className="text-gray-500">구간 분포:</span> 1-15:{lowCount} / 16-30:{midCount} / 31-45:{highCount}
          </span>
        </li>
        <li className="flex items-start gap-1.5 text-sm text-gray-700">
          <span className="text-emerald-600 shrink-0" aria-hidden="true">
            ✓
          </span>
          <span>
            <span className="text-gray-500">적용 조건:</span> {conditions.length}개 ({conditions.join(' · ')})
          </span>
        </li>
      </ul>
    </div>
  );
}
