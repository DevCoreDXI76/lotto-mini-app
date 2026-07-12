'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lotto-first-visit-seen';

export function FirstVisitNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function handleConfirm() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="최초 방문 안내"
        className="w-full max-w-sm rounded-xl bg-white shadow-sm p-6 space-y-4"
      >
        <p className="text-sm text-gray-700">
          이 앱은 재미를 위한 서비스이며 당첨을 보장하지 않습니다.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-black text-white rounded-lg py-2 font-semibold"
        >
          확인
        </button>
      </div>
    </div>
  );
}
