import type { Metadata } from 'next';
import { GeneratorClient } from './GeneratorClient';

export const metadata: Metadata = {
  title: '로또 번호 생성기',
  description:
    '통계 기반 5가지 전략(빈도/엘리트/균형/Cold/랜덤)으로 로또 번호를 무료로 생성하세요. 세트 수 또는 예산에 맞춰 조합을 만들고 최근 회차 활성도까지 확인할 수 있습니다.',
};

export default function GeneratorPage() {
  return <GeneratorClient />;
}
