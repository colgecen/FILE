import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../../electron/shared/api-types';
import { CommandRegistry } from './commands';
import { adoptFile, registerFileCommands, runOpenFile } from './fileCommands';
import { openFilesModel } from './openFiles';
import { recentFiles } from './recentFiles';
import { tabsModel } from './tabs';

const sampleFile = { path: '/proje/main.ts', name: 'main.ts', content: 'x', language: 'ts' };

describe('dosya açma akışı', () => {
  beforeEach(() => {
    tabsModel.reset();
    recentFiles.reset();
    openFilesModel.set([]);
  });
  it('dialog sonucunu sekte açar, son kullanılanlara ve açık dosyalara ekler', async () => {
    const api = { openFile: vi.fn().mockResolvedValue(sampleFile) } satisfies Pick<Api, 'openFile'>;

    const result = await runOpenFile(api);

    expect(result).toEqual({ ok: true });
    expect(tabsModel.getState().tabs.map((tab) => tab.id)).toContain('/proje/main.ts');
    expect(recentFiles.list().map((entry) => entry.path)).toContain('/proje/main.ts');
    expect(openFilesModel.list().map((entry) => entry.path)).toContain('/proje/main.ts');
  });

  it('dialog iptal edilirse hiçbir şey değişmez', async () => {
    const api = { openFile: vi.fn().mockResolvedValue(null) } satisfies Pick<Api, 'openFile'>;

    const result = await runOpenFile(api);

    expect(result).toEqual({ ok: true });
    expect(tabsModel.getState().tabs).toHaveLength(0);
  });

  it('adoptFile aynı dosyayı iki kez açık listeye eklemez', () => {
    adoptFile(sampleFile);
    adoptFile(sampleFile);
    expect(openFilesModel.list()).toHaveLength(1);
    expect(tabsModel.getState().tabs).toHaveLength(1);
  });

  it('file.open.file komutunu kaydeder', () => {
    const registry = new CommandRegistry();
    registerFileCommands(registry.register.bind(registry));
    expect(registry.get('file.open.file')).toBeDefined();
  });
});