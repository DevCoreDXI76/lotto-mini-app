export function AdSlot({ slot }: { slot: string }) {
  return (
    <div
      data-ad-slot={slot}
      className="w-full min-h-[100px] flex items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400"
      aria-hidden="true"
    >
      광고 영역
    </div>
  );
}
