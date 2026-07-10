const COLORS: Record<string, string> = {
  low: 'bg-yellow-400',
  mid: 'bg-blue-400',
  high: 'bg-red-400',
};

function colorFor(n: number) {
  if (n <= 15) return COLORS.low;
  if (n <= 30) return COLORS.mid;
  return COLORS.high;
}

export function NumberBall({ n }: { n: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white font-bold text-sm ${colorFor(n)}`}
    >
      {n}
    </span>
  );
}
