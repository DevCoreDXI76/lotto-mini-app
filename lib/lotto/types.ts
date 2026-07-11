export type Strategy = 'frequency' | 'elite' | 'balanced' | 'cold' | 'random';

export interface StrategyMeta {
  id: Strategy;
  icon: string;
  label: string;
  formula: string;
  description: string;
  features: string[];
  recommendedFor: string;
  conditions: string[];
}

export const STRATEGIES: StrategyMeta[] = [
  {
    id: 'frequency',
    icon: '🔵',
    label: '빈도 기반',
    formula: '빈도 + 이월수 + 이웃수 + 동끝수',
    description:
      '전체 회차의 출현 빈도, 직전 회차와 겹치는 이월수, 직전 번호의 ±1 이웃수, 끝자리가 같은 동끝수를 종합해 다음 회차에 나올 가능성이 높은 번호를 추출하는 기본 통계 기법입니다.',
    features: [
      '전체 회차 출현 빈도 상위 번호 우선 반영',
      '직전 회차 번호의 ±1 이웃수에 가중치 부여',
      '최근 회차와 끝자리가 같은 번호를 그룹화해 반영',
    ],
    recommendedFor: '최근 출현 흐름과 패턴을 중시하는 분',
    conditions: ['빈도', '이월수', '이웃수', '동끝수'],
  },
  {
    id: 'elite',
    icon: '🏆',
    label: '엘리트 집중',
    formula: '빈도×3 + 이월수×3 + Cold×2',
    description:
      '빈도 상위 번호와 이월수에 가장 높은 가중치를 주고, 오랫동안 나오지 않은 Cold 번호를 보조적으로 섞어 데이터로 검증된 번호 위주로 조합하는 기법입니다.',
    features: [
      '전체 빈도 상위 번호에 3배 가중',
      '이월수(직전 회차 겹침)에 3배 가중',
      '미출현 Cold 번호는 2배로 다양성만 확보',
    ],
    recommendedFor: '데이터로 검증된 번호를 우선하고 싶은 분',
    conditions: ['빈도×3', '이월수×3', 'Cold×2'],
  },
  {
    id: 'balanced',
    icon: '⚖️',
    label: '균형 조합',
    formula: '홀짝 3:3 + 구간 균등배분',
    description:
      '홀수와 짝수 비율을 3:3으로 맞추고 1~15, 16~30, 31~45 구간에 번호를 고르게 배분해 특정 패턴에 치우치지 않는 균형 잡힌 조합을 만드는 기법입니다.',
    features: [
      '홀수:짝수 비율을 3:3으로 유지',
      '1~15 / 16~30 / 31~45 구간에 균등 배분',
      '특정 구간·홀짝 쏠림 방지',
    ],
    recommendedFor: '통계적으로 안정적인 분포를 선호하는 분',
    conditions: ['홀짝 3:3', '구간 균등배분'],
  },
  {
    id: 'cold',
    icon: '❄️',
    label: '미출현 역추세',
    formula: '미출현 상위 25수 역추세 조합',
    description:
      '오랫동안 나오지 않은 번호(미출현 상위 25개) 중심으로 조합해 "나올 때가 됐다"는 역발상 논리를 취하는 역추세 기법입니다.',
    features: [
      '전체 회차 기준 미출현 일수 상위 25개 번호 풀 사용',
      '오래 쉰 번호일수록 더 높은 가중치 부여',
      '최근 강세 번호와 반대되는 조합을 추구',
    ],
    recommendedFor: '역추세·평균회귀 논리를 선호하는 분',
    conditions: ['미출현 상위 25수 역추세'],
  },
  {
    id: 'random',
    icon: '🔀',
    label: '종합 랜덤',
    formula: '5개 기법 균등 가중 랜덤',
    description:
      '빈도·엘리트·균형·Cold 4개 기법의 점수를 동일 비중으로 합산한 뒤 가중 랜덤으로 추출해, 특정 기법에 치우치지 않는 종합적인 조합을 생성하는 기법입니다.',
    features: [
      '4개 전략 점수를 동일 비중으로 합산',
      '합산 점수 상위 후보군에서 가중 랜덤 추출',
      '생성할 때마다 다른 조합을 제공',
    ],
    recommendedFor: '하나의 기법에 얽매이지 않고 골고루 섞고 싶은 분',
    conditions: ['빈도', '이월수', 'Cold', '이웃수', '동끝수'],
  },
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
