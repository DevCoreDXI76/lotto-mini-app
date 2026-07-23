import type { Metadata } from 'next';
import { StoresClient } from './StoresClient';

export const metadata: Metadata = {
  title: '로또 판매점 찾기',
  description:
    '내 주변 로또 판매점을 지도와 리스트로 찾아보고, 1등 당첨 이력이 확인된 판매점을 함께 확인하세요.',
};

export default function StoresPage() {
  return <StoresClient />;
}
