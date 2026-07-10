'use client';

export function IncludeNumbersInput({
  value,
  onChange,
  excluded,
}: {
  value: string;
  onChange: (v: string) => void;
  excluded: number[];
}) {
  const included = value
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
  const overLimit = included.length > 5;
  const overlap = included.filter((n) => excluded.includes(n));

  return (
    <div>
      <h2 className="font-semibold mb-2">포함 번호 (최대 5개, 쉼표로 구분)</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="예: 6, 36"
      />
      {overLimit && (
        <p className="text-sm text-red-500 mt-1">포함 번호는 최대 5개까지 선택할 수 있습니다.</p>
      )}
      {overlap.length > 0 && (
        <p className="text-sm text-red-500 mt-1">제외 번호와 겹칩니다: {overlap.join(', ')}</p>
      )}
    </div>
  );
}
