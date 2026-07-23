import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fullHistory from '@/data/lotto-full-history.json';
import type { LottoDraw } from '@/lib/lotto/types';
import { computeDrawInsight } from '@/lib/lotto/drawInsights';
import { NumberBall } from '@/components/lotto/NumberBall';
import { Disclaimer } from '@/components/lotto/Disclaimer';

const history = fullHistory as LottoDraw[];
const byDrawNumber = new Map(history.map((draw) => [draw.drawNumber, draw]));

export function generateStaticParams() {
  return history.map((draw) => ({ drawNumber: String(draw.drawNumber) }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ drawNumber: string }>;
}): Promise<Metadata> {
  const { drawNumber } = await params;
  const draw = byDrawNumber.get(Number(drawNumber));
  if (!draw) return {};

  return {
    title: `로또 ${draw.drawNumber}회 당첨번호`,
    description: `${draw.date} 추첨된 로또 ${draw.drawNumber}회 당첨번호, 보너스번호, 홀짝 비율, 번호 합계와 직전 회차 대비 변화를 확인하세요.`,
  };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ drawNumber: string }>;
}) {
  const { drawNumber } = await params;
  const draw = byDrawNumber.get(Number(drawNumber));
  if (!draw) notFound();

  const previous = byDrawNumber.get(draw.drawNumber - 1);
  const insight = computeDrawInsight(draw, previous);
  const hasPrevious = byDrawNumber.has(draw.drawNumber - 1);
  const hasNext = byDrawNumber.has(draw.drawNumber + 1);

  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">로또 {draw.drawNumber}회 당첨번호</h1>
        <p className="text-sm text-gray-500 mt-1">{draw.date} 추첨</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-2">
        {draw.numbers.map((n) => (
          <NumberBall key={n} n={n} />
        ))}
        <span className="text-gray-400 px-1">+</span>
        <NumberBall n={draw.bonusNumber} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-1 text-sm text-gray-600">
        <p>
          홀수 {insight.oddCount}개 · 짝수 {insight.evenCount}개
        </p>
        <p>
          번호 합계 {insight.sum} (평균 {insight.average.toFixed(1)})
        </p>
        {insight.sumDiffFromPrevious !== null && (
          <p>
            직전 {draw.drawNumber - 1}회 대비 합계{' '}
            {insight.sumDiffFromPrevious > 0
              ? `+${insight.sumDiffFromPrevious}`
              : insight.sumDiffFromPrevious}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        {hasPrevious ? (
          <Link href={`/result/${draw.drawNumber - 1}`} className="text-blue-600 underline">
            ← {draw.drawNumber - 1}회
          </Link>
        ) : (
          <span />
        )}
        <Link href="/result" className="text-gray-500 underline">
          전체 회차 목록
        </Link>
        {hasNext ? (
          <Link href={`/result/${draw.drawNumber + 1}`} className="text-blue-600 underline">
            {draw.drawNumber + 1}회 →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <Link href="/stats" className="block text-sm text-gray-500 underline">
        역대 통계 전체 보기 →
      </Link>

      <Disclaimer />
    </main>
  );
}
