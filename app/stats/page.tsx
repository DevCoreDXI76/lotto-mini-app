// app/stats/page.tsx
import Link from 'next/link';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeFrequencyRanking } from '@/lib/lotto/stats';
import { NumberBall } from '@/components/lotto/NumberBall';
import { FullRankingToggle } from '@/components/lotto/FullRankingToggle';

export default function StatsPage() {
  const history = fullHistory as LottoDraw[];
  const ranking = computeFrequencyRanking(history);
  const top6 = ranking.slice(0, 6);
  const rounds = history.map((d) => d.drawNumber);
  const minRound = Math.min(...rounds);
  const maxRound = Math.max(...rounds);
  const latestDraw = history.find((d) => d.drawNumber === maxRound)!;

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">역대 통계</h1>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="font-semibold">역대 가장 많이 나온 번호는 {top6[0].number}번입니다.</p>
        <ul className="mt-3 space-y-2">
          {top6.map((entry) => (
            <li key={entry.number} className="flex items-center gap-3">
              <NumberBall n={entry.number} />
              <span className="text-sm text-gray-600">{entry.count}회</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        {minRound}회 ~ {maxRound}회 기준, 최종 갱신 {latestDraw.date}
      </p>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <FullRankingToggle entries={ranking} />
      </div>

      <p className="text-sm text-gray-500">
        이 통계는 과거 데이터일 뿐이며 향후 당첨을 예측하지 않습니다.
      </p>

      <Link href="/" className="block text-center text-sm text-gray-500 underline">
        홈으로
      </Link>
    </main>
  );
}
