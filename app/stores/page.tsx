import type { Metadata } from 'next';
import { StoresClient } from './StoresClient';
import { Faq } from '@/components/lotto/Faq';
import { AdSlot } from '@/components/lotto/AdSlot';

export const metadata: Metadata = {
  title: '로또 판매점 찾기',
  description:
    '내 주변 로또 판매점을 지도와 리스트로 찾아보고, 1등 당첨 이력이 확인된 판매점을 함께 확인하세요.',
};

const STORES_FAQ_ITEMS = [
  {
    q: '1등 배출 이력이 있는 판매점에서 사면 당첨 확률이 높아지나요?',
    a: '아닙니다. 판매량이 많은 판매점일수록 통계적으로 1등 배출 건수가 누적되기 쉬울 뿐, 특정 판매점에서 구매한다고 당첨 확률 자체가 올라가지 않습니다.',
  },
  {
    q: '판매점 정보는 얼마나 자주 갱신되나요?',
    a: '현재 목록은 최근 갱신 시점 기준 스냅샷이며, 폐업하거나 새로 생긴 판매점이 즉시 반영되지 않을 수 있습니다.',
  },
];

export default function StoresPage() {
  return (
    <>
      <StoresClient />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4 pb-6">
        <AdSlot slot="stores-bottom" />
        <Faq items={STORES_FAQ_ITEMS} />
      </div>
    </>
  );
}
