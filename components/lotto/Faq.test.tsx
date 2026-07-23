// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { Faq } from './Faq';

afterEach(() => {
  cleanup();
});

describe('Faq', () => {
  const items = [
    { q: '질문 1', a: '답변 1' },
    { q: '질문 2', a: '답변 2' },
  ];

  it('renders all questions but hides answers by default', () => {
    render(<Faq items={items} />);
    expect(screen.getByText('질문 1')).toBeInTheDocument();
    expect(screen.queryByText('답변 1')).not.toBeInTheDocument();
  });

  it('reveals an answer when its question is clicked', () => {
    render(<Faq items={items} />);
    fireEvent.click(screen.getByText('질문 1'));
    expect(screen.getByText('답변 1')).toBeInTheDocument();
    expect(screen.queryByText('답변 2')).not.toBeInTheDocument();
  });
});
