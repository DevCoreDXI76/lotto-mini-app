import Link from 'next/link';

export function Footer() {
  return (
    <footer className="text-xs text-gray-400 text-center py-6 border-t space-y-1">
      <p>이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.</p>
      <p>
        <Link href="/privacy" className="underline hover:text-gray-600">
          개인정보처리방침 · 운영자 정보
        </Link>
      </p>
    </footer>
  );
}
