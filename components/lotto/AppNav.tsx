'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/generator', label: '번호 생성기' },
  { href: '/stats', label: '통계' },
  { href: '/result', label: '회차별 당첨번호' },
  { href: '/stores', label: '판매점 찾기' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 flex justify-center">
      <div className="flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                active ? 'bg-[#2B52F0] text-white shadow-sm' : 'text-slate-600 hover:bg-white/70'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
