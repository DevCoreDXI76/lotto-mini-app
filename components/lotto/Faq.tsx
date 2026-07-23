'use client';

import { useState } from 'react';

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm divide-y">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q} className="p-4">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="w-full text-left text-sm font-semibold flex justify-between items-center"
              aria-expanded={open}
            >
              {item.q}
              <span className="text-gray-400">{open ? '−' : '+'}</span>
            </button>
            {open && <p className="text-sm text-gray-600 mt-2">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
