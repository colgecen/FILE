import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addEnvironmentViaDialog,
  adoptFolderAsEnvironment,
  cycleEnvironment,
  openEnvironmentBrowser,
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

  it('ortam tarayıcısı kayıtlı adresi zen/chrome üzerinden açar', async () => {
    environmentsModel.add('/proj/a', 'a');
    environmentsModel.setBrowserUrl('/proj/a', 'https://docs.example.com/x');
    vi.mocked(window.api.openInBrowser).mockResolvedValueOnce('zen');
    const result = await openEnvironmentBrowser('/proj/a');
    expect(result.ok).toBe(true);
    expect(window.api.openInBrowser).toHaveBeenCalledWith('https://docs.example.com/x');
  });

  it('kayıtsız ortamda geçersiz adres hata verir, tarayıcı yoksa hata döner', async () => {
    environmentsModel.add('/proj/a', 'a');
    environmentsModel.setBrowserUrl('/proj/a', 'ftp://olmaz');
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    const bad = await openEnvironmentBrowser('/proj/a');
    expect(bad.ok).toBe(true); // geçersiz kayıtlı adres prompt'u tetikler, iptal sessiz geçerdir
    environmentsModel.setBrowserUrl('/proj/a', 'https://olmaz.com');
    vi.mocked(window.api.openInBrowser).mockResolvedValueOnce('none');
    const missing = await openEnvironmentBrowser('/proj/a');
    expect(missing.ok).toBe(false);
  });
});
