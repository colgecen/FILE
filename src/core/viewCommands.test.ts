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

  it('view.sidebar.* ve view.layout.single komutları kayıtlıdır ve rozetsiz çalışır', async () => {
    const { openFilesModel } = await import('./openFiles');
    openFilesModel.set([{ name: 'a.ts', path: '/a.ts' }]);
    const list = commands();
    for (const id of [
      'view.sidebar.explorer',
      'view.sidebar.search',
      'view.sidebar.source',
      'view.sidebar.run',
      'view.layout.single',
    ]) {
      const command = list.find((entry) => entry.id === id);
      expect(command, `${id} kayıtlı olmalı`).toBeDefined();
      expect(command?.placeholder).toBeUndefined();
      const result = command?.run() as unknown;
      if (result instanceof Promise) {
        const awaited = await result;
        expect(awaited.ok).toBe(true);
      } else {
        expect((result as { ok: boolean }).ok).toBe(true);
      }
    }
    openFilesModel.set([]);
  });
});