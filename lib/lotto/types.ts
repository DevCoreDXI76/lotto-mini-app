export type Strategy = 'frequency' | 'carryover' | 'balanced' | 'cold' | 'random';

export const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: 'frequency', label: '빈도 기반' },
  { id: 'carryover', label: '이월수 반영' },
  { id: 'balanced', label: '균형 조합' },
  { id: 'cold', label: '미출현 번호 역추세' },
  { id: 'random', label: '종합 랜덤' },
];

export interface LottoDraw {
  drawNumber: number;
  date: string;
  numbers: [number, number, number, number, number, number];
  bonusNumber: number;
}

export interface GeneratedGame {
  numbers: number[];
}
