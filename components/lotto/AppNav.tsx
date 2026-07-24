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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex justify-center gap-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors border ${
                active
                  ? 'bg-[#2B52F0] text-white border-[#2B52F0] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
