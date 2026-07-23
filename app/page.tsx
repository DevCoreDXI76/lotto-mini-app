import Link from 'next/link';
import { LatestDraw } from '@/components/lotto/LatestDraw';
import { Disclaimer } from '@/components/lotto/Disclaimer';
import { StoreFinderLink } from '@/components/lotto/StoreFinderLink';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeFrequencyRanking } from '@/lib/lotto/stats';
import { NumberBall } from '@/components/lotto/NumberBall';
import { SITE_NAME } from '@/lib/site';

export default function Home() {
  const history = fullHistory as LottoDraw[];
  const top6 = computeFrequencyRanking(history).slice(0, 6);

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{SITE_NAME}</h1>
        <p className="text-sm text-gray-500 mt-1">
          번호 생성기·통계·판매점 찾기를 한 곳에서 무료로.
        </p>
      </div>
      <LatestDraw />
      <Link
        href="/generator"
        className="block text-center bg-black text-white rounded-lg py-3 font-semibold"
      >
        번호 생성기 바로가기
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-sm mb-2">역대 최다 출현 TOP 6</h2>
        <div className="flex flex-wrap gap-2">
          {top6.map((entry) => (
            <NumberBall key={entry.number} n={entry.number} />
          ))}
        </div>
        <Link href="/stats" className="block text-sm text-gray-500 underline mt-3">
          전체 통계 보기 →
        </Link>
      </div>

      <StoreFinderLink />

      <Disclaimer />
    </main>
  );
}
