export function DetailedDisclaimer({ drawNumber, date }: { drawNumber: number; date: string }) {
  return (
    <p className="text-xs text-gray-500 border-t pt-3 mt-4 leading-relaxed">
      본 분석은 통계 기반 참고 정보입니다(기준 회차: {drawNumber}회, {date}). 실제 결과와 차이가 있을 수 있으며
      당첨을 보장하지 않습니다. 로또는 1~45 중 6개를 무작위로 추첨하는 완전 확률 게임이며, 과거 패턴이 미래
      결과를 예측하지 않습니다. 본 정보는 재미를 위한 통계이며 투자·도박 조언이 아닙니다. 정확한 당첨 결과는{' '}
      <a
        href="https://www.dhlottery.co.kr"
        className="underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        동행복권(dhlottery.co.kr)
      </a>
      에서 확인하세요.
    </p>
  );
}
