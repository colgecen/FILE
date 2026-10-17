import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addEnvironmentViaDialog,
  adoptFolderAsEnvironment,
  cycleEnvironment,
  openBrowserEnvironment,
  removeEnvironment,
  switchToEnvironment,
} from './envCommands';
import { environmentsModel } from './environments';
import { browserUrlPromptModel } from './browserUrlPrompt';
import { onAppError } from './appErrors';
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
  browserUrlPromptModel.close();
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

  it('tarayıcı ortamı ilk açılışta adres kutusunu açar, adres verilince başlatır', async () => {
    vi.mocked(window.api.openInBrowser).mockClear();
    environmentsModel.add('/proj/a', 'a');
    const result = await openBrowserEnvironment('zen');
    expect(result.ok).toBe(true);
    expect(window.api.openInBrowser).not.toHaveBeenCalled();
    const prompt = browserUrlPromptModel.getSnapshot();
    expect(prompt?.label).toBe('Zen ile aç');
    expect(environmentsModel.getState().environments.some((entry) => entry.id === 'browser:zen')).toBe(true);
    vi.mocked(window.api.openInBrowser).mockResolvedValueOnce('zen');
    prompt?.onSubmit('https://docs.example.com/x');
    await vi.waitFor(() => {
      expect(window.api.openInBrowser).toHaveBeenCalledWith('https://docs.example.com/x', 'zen');
    });
    expect(environmentsModel.getState().environments.find((entry) => entry.id === 'browser:zen')?.browserUrl).toBe(
      'https://docs.example.com/x',
    );
    expect(browserUrlPromptModel.getSnapshot()).toBeNull();
  });

  it('kayıtlı adres varsa kutu açılmaz, doğrudan başlar; ortam çoğalmaz', async () => {
    vi.mocked(window.api.openInBrowser).mockClear();
    environmentsModel.addExternal({
      id: 'browser:firefox',
      name: 'Firefox',
      rootPath: 'browser:firefox',
      tabs: { files: [], activeId: null },
      browserUrl: 'https://a.dev',
    });
    vi.mocked(window.api.openInBrowser).mockResolvedValue('firefox');
    await openBrowserEnvironment('firefox');
    await openBrowserEnvironment('firefox');
    expect(browserUrlPromptModel.getSnapshot()).toBeNull();
    expect(window.api.openInBrowser).toHaveBeenCalledTimes(2);
    expect(environmentsModel.getState().environments.filter((entry) => entry.id === 'browser:firefox')).toHaveLength(1);
  });

  it('tarayıcı bulunamazsa hata bildirir, geçersiz adres kutuyu kapatmaz', async () => {
    const errors: string[] = [];
    const off = onAppError((error) => errors.push(error.message));
    vi.mocked(window.api.openInBrowser).mockClear();
    await openBrowserEnvironment('zen');
    vi.mocked(window.api.openInBrowser).mockResolvedValueOnce('none');
    browserUrlPromptModel.getSnapshot()?.onSubmit('https://a.dev');
    await vi.waitFor(() => {
      expect(errors.some((message) => message.includes('başlatılamadı'))).toBe(true);
    });
    expect(browserUrlPromptModel.getSnapshot()).toBeNull();
    await openBrowserEnvironment('chromium');
    browserUrlPromptModel.getSnapshot()?.onSubmit('ftp://olmaz');
    expect(browserUrlPromptModel.getSnapshot()).not.toBeNull();
    expect(errors.some((message) => message.includes('Geçersiz adres'))).toBe(true);
    off();
  });
});
