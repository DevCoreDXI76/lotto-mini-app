'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/generator', label: '번호 생성기' },
  { href: '/stats', label: '통계' },
  { href: '/stores', label: '판매점 찾기' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 flex gap-2 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              active ? 'bg-black text-white' : 'bg-white text-gray-600 shadow-sm hover:shadow'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
