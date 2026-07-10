export type Strategy = 'frequency' | 'elite' | 'balanced' | 'cold' | 'random';

export interface StrategyMeta {
  id: Strategy;
  icon: string;
  label: string;
  formula: string;
}

export const STRATEGIES: StrategyMeta[] = [
  { id: 'frequency', icon: '🔵', label: '빈도 기반', formula: '빈도 + 이월수 + 이웃수 + 동끝수' },
  { id: 'elite', icon: '🏆', label: '엘리트 집중', formula: '빈도×3 + 이월수×3 + Cold×2' },
  { id: 'balanced', icon: '⚖️', label: '균형 조합', formula: '홀짝 3:3 + 구간 균등배분' },
  { id: 'cold', icon: '❄️', label: '미출현 역추세', formula: '미출현 상위 25수 역추세 조합' },
  { id: 'random', icon: '🔀', label: '종합 랜덤', formula: '5개 기법 균등 가중 랜덤' },
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
