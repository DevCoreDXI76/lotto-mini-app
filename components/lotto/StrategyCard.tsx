'use client';

import type { Strategy, StrategyMeta } from '@/lib/lotto/types';

export function StrategyCard({
  strategy,
  selected,
  onSelect,
}: {
  strategy: StrategyMeta;
  selected: boolean;
  onSelect: (id: Strategy) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(strategy.id)}
      aria-pressed={selected}
      className={`w-full text-left border rounded-lg p-3 flex items-center gap-3 ${
        selected ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200'
      }`}
    >
      <span className="text-xl" aria-hidden="true">
        {strategy.icon}
      </span>
      <span>
        <span className="block font-semibold text-sm">{strategy.label}</span>
        <span className="block text-xs text-gray-500">{strategy.formula}</span>
      </span>
    </button>
  );
}
