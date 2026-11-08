import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addEnvironmentViaDialog,
  adoptFolderAsEnvironment,
  cycleEnvironment,
  isBrowserEnvId,
  openBrowserTab,
  removeEnvironment,
  switchToEnvironment,
} from './envCommands';
import { createBrowserTab, environmentsModel } from './environments';
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

  it('klasör benimsenince proje sekmesi eklenir', () => {
    adoptFolderAsEnvironment('/proj/yeni', 'yeni');
    expect(environmentsModel.getState().activeId).toBe('/proj/yeni');
    expect(tabsModel.getState().tabs).toHaveLength(0);
  });

  it('açık klasör yeniden açılınca kayıtlı sekmeleri geri yüklenir', () => {
    environmentsModel.add('/proj/a', 'a');
    tabsModel.open(fileA());
    environmentsModel.storeTabs('/proj/a', {
      files: [fileA()],
      activeId: '/proj/a/a.ts',
    });
    adoptFolderAsEnvironment('/proj/b', 'b');
    expect(tabsModel.getState().tabs).toHaveLength(0);
    adoptFolderAsEnvironment('/proj/a', 'a');
    expect(tabsModel.getState().activeId).toBe('/proj/a/a.ts');
  });

  it('ensure kipi sekmelere dokunmadan ortamı hazırlar', () => {
    environmentsModel.add('/proj/a', 'a');
    tabsModel.open(fileA());
    adoptFolderAsEnvironment('/proj/b', 'b', 'ensure');
    expect(environmentsModel.getState().activeId).toBe('/proj/b');
    expect(tabsModel.getState().tabs).toHaveLength(1);
    expect(tabsModel.getState().activeId).toBe('/proj/a/a.ts');
  });

  it('aynı ortamda ensure sekmeleri saklar', () => {
    environmentsModel.add('/proj/a', 'a');
    tabsModel.open(fileA());
    adoptFolderAsEnvironment('/proj/a', 'a', 'ensure');
    expect(tabsModel.getState().tabs).toHaveLength(1);
    expect(environmentsModel.active()?.tabs.files).toHaveLength(1);
  });

  it('yeni tarayıcı sekmesi uygulama içinde açılır ve adresini korur', () => {
    environmentsModel.add('/proj/a', 'a');
    const result = openBrowserTab('https://ornek.test/dokumantasyon');
    expect(result.ok).toBe(true);
    const state = environmentsModel.getState();
    const tab = state.environments.find((entry) => entry.browserUrl !== null);
    expect(state.activeId).toBe(tab?.id);
    expect(tab?.browserUrl).toBe('https://ornek.test/dokumantasyon');
    expect(tab?.name).toBe('ornek.test');
  });

  it('her sekme ayrı ortamdır ve URL olmadan boş açılır', () => {
    const first = createBrowserTab();
    const second = createBrowserTab('https://site.test');
    expect(second).not.toBe(first);
    const envs = environmentsModel.getState().environments;
    expect(envs.find((entry) => entry.id === first)?.browserUrl).toBeNull();
    expect(envs.find((entry) => entry.id === second)?.browserUrl).toBe('https://site.test');
  });

  it('tarayıcı sekmeleri klasör ortamlarından ayırt edilir', () => {
    environmentsModel.add('/proj/a', 'a');
    const tabId = createBrowserTab();
    expect(isBrowserEnvId(tabId)).toBe(true);
    expect(isBrowserEnvId('/proj/a')).toBe(false);
  });

  it('tarayıcı sekmesi kapanınca ortam listeden düşer', async () => {
    const tabId = createBrowserTab();
    const result = await removeEnvironment(tabId);
    expect(result.ok).toBe(true);
    expect(environmentsModel.getState().environments.some((entry) => entry.id === tabId)).toBe(false);
  });
});
