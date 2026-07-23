import type { Metadata } from 'next';
import { GeneratorClient } from './GeneratorClient';
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

export const metadata: Metadata = {
  title: '로또 번호 생성기',
  description:
    '통계 기반 5가지 전략(빈도/엘리트/균형/Cold/랜덤)으로 로또 번호를 무료로 생성하세요. 세트 수 또는 예산에 맞춰 조합을 만들고 최근 회차 활성도까지 확인할 수 있습니다.',
};

const FAQ_ITEMS = [
  {
    q: '생성된 번호가 당첨을 보장하나요?',
    a: '아닙니다. 로또랩의 번호 생성기는 과거 당첨 데이터를 통계적으로 분석해 후보를 제시할 뿐이며, 실제 추첨에서는 어떤 조합이든 당첨 확률이 동일합니다.',
  },
  {
    q: '5가지 전략 중 어떤 걸 선택해야 하나요?',
    a: '정해진 정답은 없습니다. 최근 출현 흐름을 중시한다면 빈도 기반이나 엘리트 집중을, 특정 패턴에 치우치지 않길 원한다면 균형 조합을, 역발상 접근을 원한다면 미출현 역추세를 선택하면 됩니다.',
  },
  {
    q: '예산 기반 생성은 어떻게 작동하나요?',
    a: '입력한 예산을 1게임당 1,000원 기준으로 나눠 최대로 생성 가능한 게임 수를 계산한 뒤, 선택한 전략에 맞춰 그만큼의 조합을 채워줍니다.',
  },
];

export default function GeneratorPage() {
  return (
    <>
      <section className="max-w-xl mx-auto px-6 pt-6 text-sm text-gray-600">
        <p>
          로또랩 번호 생성기는 역대 로또 6/45 당첨번호를 분석해 빈도·이월수·이웃수·동끝수 등의
          통계 기법으로 번호 조합을 만들어 드립니다. 세트 수를 직접 정하거나 예산에 맞춰 최대한
          많은 게임을 한 번에 생성할 수 있습니다.
        </p>
      </section>
      <GeneratorClient />
      <div className="max-w-xl mx-auto px-6 space-y-6 pb-6">
        <AdSlot slot="generator-bottom" />
        <Faq items={FAQ_ITEMS} />
      </div>
    </>
  );
}
