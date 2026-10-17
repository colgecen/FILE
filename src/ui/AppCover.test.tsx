import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AppCover } from './AppCover';

describe('AppCover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ilk anda logosu ile gorunur', () => {
    render(<AppCover />);
    const cover = screen.getByTestId('app-cover');
    expect(cover.querySelector('img[src="./FILE.png"]')).not.toBeNull();
    expect(cover.className).toBe('app-cover');
  });

  it('sure bitince solarak kaldirilir', () => {
    render(<AppCover duration={100} />);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByTestId('app-cover').className).toContain('app-cover--fade');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId('app-cover')).toBeNull();
  });
});
