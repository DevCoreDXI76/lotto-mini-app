// 매주 자동 실행되어(GitHub Actions, .github/workflows/update-lotto-data.yml) 새로 추첨된
// 회차를 감지하고 data/lotto-full-history.json, data/lotto-history-seed.json,
// data/latest-draw-fallback.json에 반영한다.
// 사용법: npx tsx scripts/update-latest-draws.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface LottoDraw {
  drawNumber: number;
  date: string;
  numbers: [number, number, number, number, number, number];
  bonusNumber: number;
}

const DATA_DIR = join(process.cwd(), 'data');
// lotto-history-seed.json은 가중치 계산(lib/lotto/weights.ts)이 참조하는
// "최근 N회차" 롤링 윈도우다 — 새 회차를 추가할 때도 이 크기를 유지한다.
const SEED_WINDOW = 150;
// 스케줄이 여러 주 밀렸을 때를 대비해 한 번 실행으로 최대 이만큼만 앞으로 확인한다.
const MAX_ROUNDS_PER_RUN = 8;

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

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8')) as T;
}

function saveJson(file: string, data: unknown) {
  writeFileSync(join(DATA_DIR, file), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const fullHistory = loadJson<LottoDraw[]>('lotto-full-history.json');
  const seed = loadJson<LottoDraw[]>('lotto-history-seed.json');
  const currentLatest = Math.max(...fullHistory.map((d) => d.drawNumber));

  const newDraws: LottoDraw[] = [];
  for (let round = currentLatest + 1; round <= currentLatest + MAX_ROUNDS_PER_RUN; round += 1) {
    const draw = await fetchRound(round);
    if (!draw) break;
    newDraws.push(draw);
    console.log(`fetched round ${round}`);
    await new Promise((r) => setTimeout(r, 200));
  }

  if (newDraws.length === 0) {
    console.log(`no new draws found after round ${currentLatest} — nothing to do`);
    return;
  }

  newDraws.sort((a, b) => b.drawNumber - a.drawNumber); // 최신 회차가 먼저 오도록

  const updatedFull = [...newDraws, ...fullHistory];
  const updatedSeed = [...newDraws, ...seed].slice(0, SEED_WINDOW);

  saveJson('lotto-full-history.json', updatedFull);
  saveJson('lotto-history-seed.json', updatedSeed);
  saveJson('latest-draw-fallback.json', updatedFull[0]);

  console.log(
    `done: added ${newDraws.length} new draw(s) — ${newDraws.map((d) => d.drawNumber).join(', ')}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
