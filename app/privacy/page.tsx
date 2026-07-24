// app/privacy/page.tsx
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: '개인정보처리방침 · 운영자 정보',
  description:
    `${SITE_NAME}의 개인정보처리방침과 서비스 운영자 연락처를 안내합니다.`,
};

const EFFECTIVE_DATE = '2026-07-24';
const CONTACT_EMAIL = 'devcoredxi00@coredxi.com';

export default function PrivacyPage() {
  return (
    <main className="min-w-0 max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">개인정보처리방침 · 운영자 정보</h1>
        <p className="text-xs text-gray-500 mt-1">시행일: {EFFECTIVE_DATE}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          {SITE_NAME}(이하 &quot;서비스&quot;)는 별도의 회원가입 없이 이용할 수 있는 무료 정보 도구이며, 이름·이메일·전화번호 등
          이용자를 식별할 수 있는 개인정보를 직접 수집하지 않습니다. 다만 서비스 이용 과정에서 아래와 같은 정보가
          처리될 수 있어 이를 투명하게 안내합니다.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold">1. 수집하는 정보와 수집 방법</h2>
        <ul className="text-sm text-gray-700 leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong>이용 통계</strong>: Vercel Analytics를 통해 페이지 방문, 번호 생성 버튼 클릭, 판매점 링크
            클릭 등 이용 패턴을 서비스 개선 목적으로 집계합니다. 개인을 식별하지 않는 형태로 처리됩니다.
          </li>
          <li>
            <strong>위치 정보</strong>: &apos;판매점 찾기&apos; 페이지에서 이용자가 브라우저 위치 정보 제공에
            동의한 경우에 한해 가까운 판매점 정렬에 사용합니다. 이 위치 정보는 <strong>브라우저 안에서만
            처리</strong>되며 서버로 전송되거나 저장되지 않습니다.
          </li>
          <li>
            <strong>텔레그램 이용 시</strong>: 텔레그램 챗봇으로 서비스를 이용하는 경우, 메시지 발송을 위해
            텔레그램이 제공하는 채팅 ID(chat ID)를 이용합니다. 그 외 개인정보는 별도로 저장하지 않습니다.
          </li>
        </ul>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold">2. 쿠키 및 광고</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          현재 서비스는 광고를 게재하지 않습니다. 향후 Google AdSense 등 광고 서비스를 도입하는 경우, Google과
          광고 파트너는 쿠키를 사용해 이전 방문 이력에 기반한 광고를 게재할 수 있습니다. 이용자는{' '}
          <a
            href="https://adssettings.google.com"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 광고 설정
          </a>{' '}
          에서 맞춤형 광고를 비활성화할 수 있습니다.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold">3. 정보의 제3자 제공 및 보유 기간</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          서비스는 법령에 특별한 규정이 있는 경우를 제외하고 수집된 정보를 제3자에게 제공하지 않습니다. 위치
          정보는 서버에 저장되지 않으며, 이용 통계는 서비스 개선 목적으로만 집계 형태로 보관합니다.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold">4. 이용자 권리</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          위치 정보 제공에 대한 동의는 언제든지 브라우저 설정에서 철회할 수 있습니다. 그 밖에 개인정보 처리와
          관련해 문의하실 사항은 아래 연락처로 알려주시면 확인 후 답변드립니다.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold">5. 운영자 정보</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          서비스명: {SITE_NAME}
          <br />
          문의: <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
        </p>
      </section>

      <p className="text-xs text-gray-400 border-t pt-3">
        본 방침은 관련 법령이나 서비스 내용 변경에 따라 개정될 수 있으며, 개정 시 이 페이지를 통해
        고지합니다.
      </p>
    </main>
  );
}
