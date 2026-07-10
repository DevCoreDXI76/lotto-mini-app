import type { StrategyMeta } from '@/lib/lotto/types';

export function AlgorithmSummaryCard({ strategy }: { strategy: StrategyMeta }) {
  return (
    <div
      className="border rounded-lg p-4 bg-gray-50"
      aria-label={`적용 알고리즘: ${strategy.label}, ${strategy.formula}`}
    >
      <h3 className="font-semibold text-sm mb-1">적용 알고리즘 요약</h3>
      <p className="text-sm text-gray-600">
        {strategy.icon} {strategy.label} — {strategy.formula}
      </p>
    </div>
  );
}
