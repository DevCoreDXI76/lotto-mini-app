'use client';

import { useEffect, useState } from 'react';
import { track } from '@vercel/analytics';

const STORAGE_KEY = 'lotto-feedback-voted';

export function MicroFeedback() {
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    // sessionStorage isn't available during server rendering, so this check can only
    // happen client-side after mount — the resulting setState is an intentional,
    // one-time sync with that browser-only API, not a derivable render value.
    if (sessionStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoted(true);
    }
  }, []);

  function handleVote(value: 'up' | 'down') {
    track('feedback_thumbs', { value });
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVoted(true);
  }

  if (voted) {
    return (
      <div className="rounded-xl bg-white shadow-sm p-4">
        <p className="text-sm text-gray-500">감사합니다! 소중한 의견 반영할게요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm p-4 flex items-center justify-between">
      <p className="text-sm text-gray-700">이 조합 어때요?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleVote('up')}
          className="text-lg px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          aria-label="좋아요"
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => handleVote('down')}
          className="text-lg px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          aria-label="별로예요"
        >
          👎
        </button>
      </div>
    </div>
  );
}
