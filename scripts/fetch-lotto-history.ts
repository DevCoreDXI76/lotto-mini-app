// picknum.com에서 회차별 당첨번호를 순회 수집해 지정된 JSON 파일로 저장한다.
// 사용법: npx tsx scripts/fetch-lotto-history.ts <startRound> <endRound> [outputFileName]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface LottoDraw {
  drawNumber: number;
  date: string;
  numbers: [number, number, number, number, number, number];
  bonusNumber: number;
}

const PATTERN =
  /"drawNumber\\?":(\d+),\\?"date\\?":\\?"([\d-]+)\\?",\\?"numbers\\?":\[([\d,]+)\],\\?"bonusNumber\\?":(\d+)/;

async function fetchRound(round: number): Promise<LottoDraw | null> {
  const res = await fetch(`https://picknum.com/lotto/${round}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(PATTERN);
  if (!match) return null;

  const [, drawNumber, date, numbersRaw, bonusNumber] = match;
  const numbers = numbersRaw.split(',').map(Number);
  if (numbers.length !== 6) return null;

  return {
    drawNumber: Number(drawNumber),
    date,
    numbers: numbers as LottoDraw['numbers'],
    bonusNumber: Number(bonusNumber),
  };
}

async function main() {
  const [startArg, endArg, outputArg] = process.argv.slice(2);
  const start = Number(startArg ?? 1082);
  const end = Number(endArg ?? 1231);
  const outputFile = outputArg ?? 'lotto-history-seed.json';

  const draws: LottoDraw[] = [];
  for (let round = end; round >= start; round--) {
    const draw = await fetchRound(round);
    if (draw) {
      draws.push(draw);
      console.log(`fetched round ${round}`);
    } else {
      console.warn(`skip round ${round}: no match`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  writeFileSync(join(process.cwd(), 'data', outputFile), JSON.stringify(draws, null, 2));

  if (draws.length > 0) {
    writeFileSync(
      join(process.cwd(), 'data', 'latest-draw-fallback.json'),
      JSON.stringify(draws[0], null, 2),
    );
  }

  console.log(`done: ${draws.length} draws saved to ${outputFile}`);
}

main();
