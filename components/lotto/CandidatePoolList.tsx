import { NumberBall } from './NumberBall';

export function CandidatePoolList({
  title,
  description,
  numbers,
}: {
  title: string;
  description: string;
  numbers: number[];
}) {
  return (
    <div className="rounded-xl p-4 bg-white shadow-sm">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="flex flex-wrap gap-1" aria-label={`${title}: ${numbers.join(', ')}번`}>
        {numbers.map((n) => (
          <NumberBall key={n} n={n} />
        ))}
      </div>
    </div>
  );
}
