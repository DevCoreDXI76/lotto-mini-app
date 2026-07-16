'use client';

import Link from 'next/link';
import { track } from '@vercel/analytics';

export function StoreFinderLink() {
  return (
    <Link
      href="/stores"
      onClick={() => track('store_finder_click')}
      className="block text-center bg-black text-white rounded-lg py-3 font-semibold"
    >
      판매점 찾기
    </Link>
  );
}
