// app/stats/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeFrequencyRanking } from '@/lib/lotto/stats';
import { NumberBall } from '@/components/lotto/NumberBall';
import { FullRankingToggle } from '@/components/lotto/FullRankingToggle';
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

export const metadata: Metadata = {
  title: '로또 당첨번호 통계',
  description:
    '역대 로또 당첨번호를 분석해 가장 많이 나온 번호 TOP 6와 전체 순위를 확인하세요. 과거 데이터 기반 통계이며 향후 당첨을 예측하지 않습니다.',
};

const STATS_FAQ_ITEMS = [
  {
    q: '이 통계로 다음 회차 당첨번호를 예측할 수 있나요?',
    a: '아닙니다. 로또 추첨은 매 회차 독립적인 확률 사건이라 과거 출현 빈도가 미래 당첨을 예측하지 않습니다. 이 페이지는 과거 데이터를 정리해 보여드릴 뿐입니다.',
  },
  {
    q: '순위는 얼마나 자주 바뀌나요?',
    a: '매주 새 회차 추첨 결과가 반영될 때마다 출현 횟수가 갱신되며, 그에 따라 순위도 조금씩 바뀔 수 있습니다.',
  },
];

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

      <Link href="/result" className="block text-sm text-gray-500 underline">
        회차별 당첨번호 전체 보기 →
      </Link>

      <p className="text-sm text-gray-500">
        이 통계는 과거 데이터일 뿐이며 향후 당첨을 예측하지 않습니다.
      </p>

      <AdSlot slot="stats-bottom" />
      <Faq items={STATS_FAQ_ITEMS} />
    </main>
  );
}
