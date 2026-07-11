import { NumberBall } from './NumberBall';

export function FinalCandidateCard({ number, tags }: { number: number; tags: string[] }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg p-2 bg-gray-50"
      aria-label={`${number}번, 특징: ${tags.join(', ')}`}
    >
      <NumberBall n={number} />
      <ul className="text-xs text-gray-600 list-disc list-inside">
        {tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  );
}
