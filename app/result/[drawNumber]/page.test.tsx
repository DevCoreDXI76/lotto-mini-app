import { describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));

const { default: ResultPage } = await import('./page');

describe('ResultPage', () => {
  it('calls notFound() for a draw number that does not exist in the data', async () => {
    await expect(
      ResultPage({ params: Promise.resolve({ drawNumber: '999999' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });
});
