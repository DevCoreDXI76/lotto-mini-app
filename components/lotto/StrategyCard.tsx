'use client';

import { useState } from 'react';
import type { Strategy, StrategyMeta } from '@/lib/lotto/types';

const PALETTE: Record<
  Strategy,
  { base: string; selected: string; ring: string; badge: string; text: string }
> = {
  frequency: {
    base: 'bg-blue-50 hover:bg-blue-100/70',
    selected: 'bg-blue-100',
    ring: 'ring-blue-300',
    badge: 'bg-blue-500',
    text: 'text-blue-800',
  },
  elite: {
    base: 'bg-amber-50 hover:bg-amber-100/70',
    selected: 'bg-amber-100',
    ring: 'ring-amber-300',
    badge: 'bg-amber-500',
    text: 'text-amber-800',
  },
  balanced: {
    base: 'bg-emerald-50 hover:bg-emerald-100/70',
    selected: 'bg-emerald-100',
    ring: 'ring-emerald-300',
    badge: 'bg-emerald-500',
    text: 'text-emerald-800',
  },
  cold: {
    base: 'bg-sky-50 hover:bg-sky-100/70',
    selected: 'bg-sky-100',
    ring: 'ring-sky-300',
    badge: 'bg-sky-500',
    text: 'text-sky-800',
  },
  random: {
    base: 'bg-violet-50 hover:bg-violet-100/70',
    selected: 'bg-violet-100',
    ring: 'ring-violet-300',
    badge: 'bg-violet-500',
    text: 'text-violet-800',
  },
};

export function StrategyCard({
  strategy,
  selected,
  onSelect,
}: {
  strategy: StrategyMeta;
  selected: boolean;
  onSelect: (id: Strategy) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = PALETTE[strategy.id];

  return (
    <div
      className={`rounded-xl transition-shadow ${selected ? `${colors.selected} shadow-md ring-2 ${colors.ring}` : `${colors.base} shadow-sm`}`}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => onSelect(strategy.id)}
          aria-pressed={selected}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm ${selected ? colors.badge : 'bg-white'}`}
            aria-hidden="true"
          >
            {strategy.icon}
          </span>
          <span className="min-w-0">
            <span className={`block font-semibold text-sm ${colors.text}`}>{strategy.label}</span>
            <span className="block text-xs text-gray-500 truncate">{strategy.formula}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${strategy.label} 전략 자세히 보기`}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs text-gray-500 bg-white/70 shadow-sm hover:bg-white"
        >
          {expanded ? '−' : 'i'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          <p className="text-xs text-gray-700 leading-relaxed">{strategy.description}</p>
          <ul className="space-y-1">
            {strategy.features.map((feature) => (
              <li key={feature} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className={`mt-0.5 ${colors.text}`} aria-hidden="true">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500">
            <span className={`font-semibold ${colors.text}`}>추천 대상</span>: {strategy.recommendedFor}
          </p>
          {!selected && (
            <button
              type="button"
              onClick={() => onSelect(strategy.id)}
              className={`w-full text-xs font-semibold text-white rounded-lg py-2 shadow-sm ${colors.badge}`}
            >
              이 전략 선택하기 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
