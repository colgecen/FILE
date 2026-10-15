import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addEnvironmentViaDialog,
  cycleEnvironment,
  removeEnvironment,
  switchToEnvironment,
} from './envCommands';
import { environmentsModel } from './environments';
import { explorerModel } from './explorer';
import { openFilesModel } from './openFiles';
import { tabsModel } from './tabs';
import type { OpenFile } from './types';

const fileA = (name = 'a.ts'): OpenFile => ({
  path: `/proj/a/${name}`,
  name,
  content: 'a',
  language: 'typescript',
});

const fileB = (name = 'b.ts'): OpenFile => ({
  path: `/proj/b/${name}`,
  name,
  content: 'b',
  language: 'typescript',
});

beforeEach(() => {
  environmentsModel.reset();
  tabsModel.reset();
  openFilesModel.set([]);
  vi.mocked(window.api.readDir).mockResolvedValue([]);
});

afterEach(() => {
  environmentsModel.reset();
  tabsModel.reset();
  openFilesModel.set([]);
  explorerModel.settle([], null);
  vi.mocked(window.api.openFolder).mockResolvedValue(null);
});

function seedTwo(): void {
  environmentsModel.add('/proj/a', 'a');
  tabsModel.open(fileA());
  environmentsModel.storeTabs('/proj/a', {
    files: [fileA()],
    activeId: '/proj/a/a.ts',
  });
  environmentsModel.add('/proj/b', 'b');
  tabsModel.reset();
}

describe('envCommands', () => {
  it('ortam değiştirince sekmeler otomatik değişir', async () => {
    seedTwo();
    const result = await switchToEnvironment('/proj/a');
    expect(result.ok).toBe(true);
    expect(tabsModel.getState().tabs).toHaveLength(1);
    expect(tabsModel.getState().activeId).toBe('/proj/a/a.ts');
    expect(explorerModel.getState().rootPath).toBe('/proj/a');
  });

  it('önceki ortamın sekmeleri saklanır', async () => {
    seedTwo();
    await switchToEnvironment('/proj/a');
    tabsModel.open(fileA('yeni.ts'));
    await switchToEnvironment('/proj/b');
    await switchToEnvironment('/proj/a');
    const paths = tabsModel.getState().tabs.map((tab) => tab.file.path);
    expect(paths).toContain('/proj/a/a.ts');
    expect(paths).toContain('/proj/a/yeni.ts');
  });

  it('bilinmeyen ortama geçilemez', async () => {
    const result = await switchToEnvironment('/yok');
    expect(result.ok).toBe(false);
  });

  it('diologtan ortam eklenir', async () => {
    vi.mocked(window.api.openFolder).mockResolvedValue({ path: '/proj/c', name: 'c' });
    const result = await addEnvironmentViaDialog();
    expect(result.ok).toBe(true);
    expect(environmentsModel.getState().activeId).toBe('/proj/c');
    expect(explorerModel.getState().rootPath).toBe('/proj/c');
  });

  it('diolog vazgeçince ortam eklenmez', async () => {
    vi.mocked(window.api.openFolder).mockResolvedValue(null);
    const result = await addEnvironmentViaDialog();
    expect(result.ok).toBe(true);
    expect(environmentsModel.getState().environments).toHaveLength(0);
  });

  it('aktif ortam kapanınca komşuya geçilir', async () => {
    seedTwo();
    tabsModel.open(fileB());
    const result = await removeEnvironment('/proj/b');
    expect(result.ok).toBe(true);
    expect(environmentsModel.getState().activeId).toBe('/proj/a');
    expect(tabsModel.getState().activeId).toBe('/proj/a/a.ts');
  });

  it('son ortam kapanınca sekmeler ve ağaç temizlenir', async () => {
    environmentsModel.add('/proj/a', 'a');
    tabsModel.open(fileA());
    const result = await removeEnvironment();
    expect(result.ok).toBe(true);
    expect(tabsModel.getState().tabs).toHaveLength(0);
    expect(explorerModel.getState().rootPath).toBeNull();
  });

  it('ortam yokken kapatma hata verir', async () => {
    const result = await removeEnvironment();
    expect(result.ok).toBe(false);
  });

  it('sonraki/önceki ortam döngüsel gezer', async () => {
    seedTwo();
    await cycleEnvironment(1);
    expect(environmentsModel.getState().activeId).toBe('/proj/a');
    await cycleEnvironment(-1);
    expect(environmentsModel.getState().activeId).toBe('/proj/b');
  });
});
