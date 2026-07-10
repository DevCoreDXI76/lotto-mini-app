'use client';

import { BUDGET_PRESETS } from '@/lib/lotto/budget';

export function BudgetPicker({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (amount: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {BUDGET_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              amount === preset ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            {preset.toLocaleString()}원
          </button>
        ))}
      </div>
      <input
        type="number"
        min={0}
        step={1000}
        value={amount}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="직접 입력 (원)"
      />
    </div>
  );
}
