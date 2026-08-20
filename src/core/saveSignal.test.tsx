import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../../electron/shared/api-types';
import { dirtyTracker } from './dirty';
import { runSaveActive } from './fileCommands';
import { saveSignal, useSaveFlash } from './saveSignal';
import { tabsModel } from './tabs';
import type { OpenFile } from './types';

const file: OpenFile = { path: '/x/a.ts', name: 'a.ts', content: 'aaa', language: 'ts' };

function FlashProbe(): React.JSX.Element {
  const active = useSaveFlash();
  return <div data-testid="flash-probe" data-active={active} />;
}

describe('useSaveFlash', () => {
  beforeEach(() => {
    tabsModel.reset();
    dirtyTracker.snapshot().forEach((path) => dirtyTracker.clearDirty(path));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sinyal gelince etkinleşir ve süre sonunda kapanır', () => {
    vi.useFakeTimers();
    render(<FlashProbe />);
    expect(screen.getByTestId('flash-probe').dataset.active).toBe('false');

    act(() => {
      saveSignal.emit();
    });
    expect(screen.getByTestId('flash-probe').dataset.active).toBe('true');

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('flash-probe').dataset.active).toBe('false');
  });

  it('başarılı kaydetme sinyali yayınlar', async () => {
    const api = {
      writeFile: vi.fn().mockResolvedValue({ ok: true, path: file.path }),
    } satisfies Pick<Api, 'writeFile'>;
    tabsModel.open(file);
    dirtyTracker.markDirty(file.path);
    const listener = vi.fn();
    const unsubscribe = saveSignal.subscribe(listener);

    await act(async () => {
      await runSaveActive(api);
    });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});