import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerViewCommands } from './viewCommands';
import { viewModeModel } from './viewMode';
import type { CommandDef } from './types';

function commands(): CommandDef[] {
  const list: CommandDef[] = [];
  registerViewCommands((command) => list.push(command));
  return list;
}

describe('görünüm modu komutları', () => {
  afterEach(() => {
    viewModeModel.reset();
  });

  it('view.fullscreen pencereyi tam ekran yapar ve modeli günceller', () => {
    const setFullscreen = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('window', { api: { setFullscreen } });
    try {
      const list = commands();
      const command = list.find((entry) => entry.id === 'view.fullscreen');
      expect(command?.run()).toEqual({ ok: true });
      expect(setFullscreen).toHaveBeenCalledWith(true);
      expect(viewModeModel.getState().fullscreen).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('view.zen zen modunu açar ve kapatır', () => {
    const list = commands();
    const command = list.find((entry) => entry.id === 'view.zen');
    expect(command?.run()).toEqual({ ok: true });
    expect(viewModeModel.getState().zen).toBe(true);
    expect(command?.run()).toEqual({ ok: true });
    expect(viewModeModel.getState().zen).toBe(false);
  });

  it('view.wordwrap sarmalamayı açar ve kapatır', () => {
    const list = commands();
    const command = list.find((entry) => entry.id === 'view.wordwrap');
    expect(command?.run()).toEqual({ ok: true });
    expect(viewModeModel.getState().wordWrap).toBe('on');
    expect(command?.run()).toEqual({ ok: true });
    expect(viewModeModel.getState().wordWrap).toBe('off');
  });
});