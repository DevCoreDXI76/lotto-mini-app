import { NextResponse } from 'next/server';
import fallback from '@/data/latest-draw-fallback.json';
import type { LottoDraw } from '@/lib/lotto/types';

const PATTERN =
  /"drawNumber\\?":(\d+),\\?"date\\?":\\?"([\d-]+)\\?",\\?"numbers\\?":\[([\d,]+)\],\\?"bonusNumber\\?":(\d+)/;

async function fetchLiveLatest(candidateRound: number): Promise<LottoDraw | null> {
  try {
    const res = await fetch(`https://picknum.com/lotto/${candidateRound}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(PATTERN);
    if (!match) return null;

    const [, drawNumber, date, numbersRaw, bonusNumber] = match;
    const numbers = numbersRaw.split(',').map(Number);
    if (numbers.length !== 6) return null;

    return {
      drawNumber: Number(drawNumber),
      date,
      numbers: numbers as LottoDraw['numbers'],
      bonusNumber: Number(bonusNumber),
    };
  } catch {
    return null;
  }
}

function nextExpectedRound(fallbackDraw: LottoDraw): number {
  const fallbackDate = new Date(fallbackDraw.date);
  const weeksSince = Math.floor((Date.now() - fallbackDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return fallbackDraw.drawNumber + Math.max(0, weeksSince);
}

export async function GET() {
  const cached = fallback as LottoDraw;
  const candidate = nextExpectedRound(cached);

  for (let round = candidate; round >= cached.drawNumber; round--) {
    const live = await fetchLiveLatest(round);
    if (live) {
      return NextResponse.json({ draw: live, source: 'live' as const });
    }
  }

  return NextResponse.json({ draw: cached, source: 'cache' as const });
}
