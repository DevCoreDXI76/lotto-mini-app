import type { Metadata } from 'next';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { ResultIndexList } from '@/components/lotto/ResultIndexList';

export const metadata: Metadata = {
  title: '회차별 당첨번호 전체 목록',
  description: '로또 6/45 역대 전체 회차의 당첨번호를 회차별로 확인하세요.',
};

export default function ResultIndexPage() {
  const history = fullHistory as LottoDraw[];
  const draws = [...history]
    .sort((a, b) => b.drawNumber - a.drawNumber)
    .map((draw) => ({ drawNumber: draw.drawNumber, date: draw.date }));

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">회차별 당첨번호</h1>
      <p className="text-sm text-gray-500">
        최신 회차부터 확인할 수 있습니다. 각 회차를 누르면 홀짝 비율, 번호 합계 등 상세 정보를 볼 수
        있습니다.
      </p>
      <ResultIndexList draws={draws} />
    </main>
  );
}
