'use client';

import { useEffect, useState } from 'react';
import type { LottoDraw } from './types';

export interface LatestDrawResult {
  draw: LottoDraw;
  source: 'live' | 'cache';
}

export function useLatestDraw(): LatestDrawResult | null {
  const [data, setData] = useState<LatestDrawResult | null>(null);

  useEffect(() => {
    fetch('/api/lotto/latest')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return data;
}
