import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../../electron/shared/api-types';
import { dirtyTracker } from './dirty';
import { runSave, runSaveActive, runSaveAll, runSaveAs } from './fileCommands';
import { recentFiles } from './recentFiles';
import { tabsModel } from './tabs';
import type { OpenFile } from './types';

const fileA: OpenFile = { path: '/x/a.ts', name: 'a.ts', content: 'aaa', language: 'ts' };
const fileB: OpenFile = { path: '/x/b.ts', name: 'b.ts', content: 'bbb', language: 'ts' };

describe('kaydetme komutları', () => {
  beforeEach(() => {
    tabsModel.reset();
    recentFiles.reset();
    dirtyTracker.snapshot().forEach((path) => dirtyTracker.clearDirty(path));
  });

  it('aktif kirli sekmeyi yazar ve kirli işaretini temizler', async () => {
    const api = {
      writeFile: vi.fn().mockResolvedValue({ ok: true, path: fileA.path }),
    } satisfies Pick<Api, 'writeFile'>;
    tabsModel.open(fileA);
    dirtyTracker.markDirty(fileA.path);

    const result = await runSaveActive(api);

    expect(result).toEqual({ ok: true });
    expect(api.writeFile).toHaveBeenCalledWith(fileA.path, 'aaa');
    expect(dirtyTracker.isDirty(fileA.path)).toBe(false);
  });

  it('yazma başarısız olursa kirli işareti korunur ve hata döner', async () => {
    const api = {
      writeFile: vi.fn().mockResolvedValue({ ok: false, path: fileA.path, error: 'Disk dolu' }),
    } satisfies Pick<Api, 'writeFile'>;
    tabsModel.open(fileA);
    dirtyTracker.markDirty(fileA.path);

    const result = await runSave(api, fileA.path, fileA.content);

    expect(result).toEqual({ ok: false, error: 'Disk dolu' });
    expect(dirtyTracker.isDirty(fileA.path)).toBe(true);
  });

  it('farklı kaydet yeni yola yazar ve sekmeyi taşır', async () => {
    const api = {
      saveFileAs: vi.fn().mockResolvedValue('/x/c.ts'),
      writeFile: vi.fn().mockResolvedValue({ ok: true, path: '/x/c.ts' }),
    } satisfies Pick<Api, 'writeFile' | 'saveFileAs'>;
    tabsModel.open(fileA);
    dirtyTracker.markDirty(fileA.path);

    const result = await runSaveAs(api);

    expect(result).toEqual({ ok: true });
    expect(api.writeFile).toHaveBeenCalledWith('/x/c.ts', 'aaa');
    expect(tabsModel.getState().tabs.map((tab) => tab.id)).not.toContain('/x/a.ts');
    expect(tabsModel.getState().tabs.map((tab) => tab.id)).toContain('/x/c.ts');
    expect(dirtyTracker.isDirty('/x/a.ts')).toBe(false);
  });

  it('tümünü kaydet yalnız kirli sekmeleri yazar', async () => {
    const api = {
      writeFile: vi.fn().mockResolvedValue({ ok: true, path: '' }),
    } satisfies Pick<Api, 'writeFile'>;
    tabsModel.open(fileA);
    tabsModel.open(fileB);
    dirtyTracker.markDirty(fileA.path);

    const result = await runSaveAll(api);

    expect(result).toEqual({ ok: true });
    expect(api.writeFile).toHaveBeenCalledTimes(1);
    expect(api.writeFile).toHaveBeenCalledWith(fileA.path, 'aaa');
    expect(dirtyTracker.isDirty(fileB.path)).toBe(false);
  });
});