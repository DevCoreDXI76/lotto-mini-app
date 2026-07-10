import { describe, it, expect } from 'vitest';
import { loadHistory } from './history';

describe('loadHistory', () => {
  it('loads a non-empty array of valid LottoDraw objects sorted by drawNumber desc', () => {
    const history = loadHistory();
    expect(history.length).toBeGreaterThan(0);
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].drawNumber).toBeGreaterThan(history[i].drawNumber);
    }
    expect(history[0].numbers).toHaveLength(6);
  });
});
