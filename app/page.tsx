import Link from 'next/link';
import { LatestDraw } from '@/components/lotto/LatestDraw';
import { Disclaimer } from '@/components/lotto/Disclaimer';

export default function Home() {
  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">로또 미니앱</h1>
      <LatestDraw />
      <Link
        href="/generator"
        className="block text-center bg-black text-white rounded-lg py-3 font-semibold"
      >
        번호 생성기 바로가기
      </Link>
      <Disclaimer />
      <footer className="text-xs text-gray-400 pt-8 border-t">
        이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
      </footer>
    </main>
  );
}
