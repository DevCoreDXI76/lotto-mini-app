import { describe, it, expect } from 'vitest';
import { classifyMessage } from './webhookLogic';

describe('classifyMessage', () => {
  it('classifies /start as launchMiniApp', () => {
    expect(classifyMessage('/start')).toEqual({ type: 'launchMiniApp' });
  });

  it('classifies /start with a bot-username suffix (group chat form) as launchMiniApp', () => {
    expect(classifyMessage('/start@my_bot')).toEqual({ type: 'launchMiniApp' });
  });

  it('classifies other slash commands as ignore', () => {
    expect(classifyMessage('/help')).toEqual({ type: 'ignore' });
  });

  it('classifies plain text as forwardFeedback with the trimmed text', () => {
    expect(classifyMessage('  이 기능 정말 좋아요  ')).toEqual({
      type: 'forwardFeedback',
      text: '이 기능 정말 좋아요',
    });
  });

  it('classifies missing or blank text as ignore', () => {
    expect(classifyMessage(undefined)).toEqual({ type: 'ignore' });
    expect(classifyMessage('   ')).toEqual({ type: 'ignore' });
  });
});
